const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { RpcProvider, Contract } = require("starknet");

const app = express();
const PORT = process.env.PORT || 4000;
const db = new sqlite3.Database(path.join(__dirname, "market.db"));

const contractAddress =
  "0x014d6c3664f25b6d4cae0a144d769a69920f731b8cb8e8ff45f2e3870a4deddd";
const provider = new RpcProvider({
  nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
});

const { polycoinAbi } = require("./polycoin_abi.js");

const abi = polycoinAbi;

const contract = new Contract(abi, contractAddress, provider);

// Middleware
app.use(cors());
app.use(express.json());

const crypto = require("crypto");

/**
 * Returns the base64-encoded low 128 bits of a SHA-256 hash.
 * @param {string} input
 * @returns {Promise<bigint>} base64-encoded 16-byte hash
 */
async function getLow128BitsOfSHA256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const low128 = new Uint8Array(hashBuffer).slice(16); // last 16 bytes = low 128 bits

  // Convert bytes to BigInt (u128)
  let result = BigInt(0);
  for (let i = 0; i < 16; i++) {
    result = (result << BigInt(8)) + BigInt(low128[i]);
  }
  return result;
}

/**
 * Syncs the local SQLite database with the on-chain contract data.
 */
async function update() {
  const contractList = await contract.list();
  console.log("✅ On-chain list:", contractList);

  // Step 1: Get first unverified record
  const unverified = await new Promise((resolve, reject) => {
    db.get("SELECT * FROM Markets WHERE IsVerified = 0 LIMIT 1", (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!unverified) {
    console.log("✅ No unverified records found.");
    return;
  }

  const originalId = unverified.id;
  const titleHash = (
    await getLow128BitsOfSHA256(unverified.title)
  );

  let matchedContract = null;

  for (const chainQ of contractList) {
    if (chainQ.question_title_hash === titleHash) {
      matchedContract = chainQ;
      break;
    }
  }

  if (matchedContract) {
    // ✅ Found a match — update id and mark as verified
    const newId = matchedContract.id.toString();
    db.run(
      `UPDATE Markets SET id = ?, expiration = ?, creator = ?, totalAmount = ?, IsVerified = 1 WHERE rowid = ?`,
      [
        newId,
        matchedContract.expiration,
        matchedContract.creator,
        matchedContract.totalAmount,
        unverified.rowid,
      ],
      (err) => {
        if (err) console.error("❌ Failed to update verified record:", err);
        else console.log(`✅ Verified market with new ID ${newId}`);
      },
    );
  } else {
    // ❌ No match found — set ID = lastContractId + 1 (if it's different)
    const lastId =
      contractList.length > 0
        ? parseInt(contractList[contractList.length - 1].id, 10)
        : 0;
    const suggestedId = (lastId + 1).toString();

    if (originalId !== suggestedId) {
      db.run(
        `UPDATE Markets SET id = ? WHERE rowid = ?`,
        [suggestedId, unverified.rowid],
        (err) => {
          if (err)
            console.error("❌ Failed to update unmatched record ID:", err);
          else console.log(`⚠️ No hash match; updated ID to ${suggestedId}`);
        },
      );
    } else {
      console.log("⚠️ No match and ID is already correct; no update needed.");
    }
  }
}

// ✅ Create Markets Table (Questions)
db.run(
  `CREATE TABLE IF NOT EXISTS Markets (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    expiration TEXT,
    creator TEXT,
    totalAmount INTEGER DEFAULT 0,
    IsExpired INTEGER DEFAULT 0,  -- 0 = false, 1 = true
    IsVerified INTEGER DEFAULT 0  -- 0 = false, 1 = true
  )`,
);

// ✅ Create Bets Table
db.run(
  `CREATE TABLE IF NOT EXISTS Bets (
    betId TEXT PRIMARY KEY,
    marketId TEXT,  -- Foreign key to Markets
    userId TEXT,    -- Indexed for fast queries
    amount INTEGER,
    outcome TEXT,
    date TEXT,
    FOREIGN KEY (marketId) REFERENCES Markets(id)
  )`,
);

// ✅ API: Save a New Market (Question)
app.post("/api/save-market", (req, res) => {
  const { id, title, description, expiration, creator } = req.body;

  if (!id || !title || !expiration || !creator) {
    return res.status(400).json({
      error: "Missing required fields",
      missingFields: { id, title, expiration, creator },
    });
  }

  db.get(`SELECT id FROM Markets WHERE id = ?`, [id], (err, existingMarket) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (existingMarket) {
      // If market exists, prevent updates to any field except totalAmount
      return res.status(400).json({
        error: "Market already exists. Only totalAmount can be updated.",
      });
    }

    // Insert new market with totalAmount defaulting to 0
    db.run(
      `INSERT INTO Markets (id, title, description, expiration, creator, totalAmount) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, description, expiration, creator, 0], // Default totalAmount to 0
      (err) => {
        if (err) {
          console.error("Error saving market:", err);
          return res.status(500).json({ error: "Database error" });
        }
        res.json({ success: true, message: "Market saved successfully" });
      },
    );
  });
});

// ✅ API: Save a Bet
app.post("/api/save-bet", (req, res) => {
  const { userId, marketId, amount, outcome, date } = req.body;
  if (!userId || !marketId || !amount || !outcome || !date) {
    return res.status(400).json({ error: "Missing required bet details" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Bet amount must be greater than 0" });
  }

  const betId = Date.now().toString();
  db.run(
    `INSERT INTO Bets (betId, marketId, userId, amount, outcome, date) VALUES (?, ?, ?, ?, ?, ?)`,
    [betId, marketId, userId, amount, outcome, date],
    function (err) {
      if (err) {
        console.error("Error saving bet:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Update totalAmount in Markets table
      db.run(
        `UPDATE Markets SET totalAmount = totalAmount + ? WHERE id = ?`,
        [amount, marketId],
        function (updateErr) {
          if (updateErr) {
            console.error("Error updating totalAmount:", updateErr);
            return res
              .status(500)
              .json({ error: "Failed to update market totalAmount" });
          }
          res.json({
            success: true,
            message: "Bet saved and totalAmount updated successfully",
          });
        },
      );
    },
  );
});

// ✅ API: Get Bets for a User
app.get("/api/user-bets/:userId", (req, res) => {
  const { userId } = req.params;
  db.all(`SELECT * FROM Bets WHERE userId = ?`, [userId], (err, bets) => {
    if (err) {
      console.error("Error fetching user bets:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ success: true, bets });
  });
});

// ✅ API: Get Market Details with Bets
app.get("/api/market/:marketId", (req, res) => {
  const { marketId } = req.params;
  db.get(`SELECT * FROM Markets WHERE id = ?`, [marketId], (err, market) => {
    if (err || !market) {
      return res.status(404).json({ error: "Market not found" });
    }

    db.all(
      `SELECT userId, amount, outcome, date FROM Bets WHERE marketId = ?`,
      [marketId],
      (err, bets) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }

        const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
        res.json({ ...market, bets, totalBetAmount });
      },
    );
  });
});

// ✅ API: Get all markets
app.get("/api/markets", (req, res) => {
  db.all(`SELECT * FROM Markets`, (err, markets) => {
    if (err) {
      console.error("Error fetching markets:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(markets || []); // Return empty array if no data
  });
});

// ✅ API: Get Next Available Market ID
/* app.get("/api/next-market-id", (req, res) => {
  const bal1 = await myTestContract.get_balance();
  db.get("SELECT id FROM Markets ORDER BY CAST(id AS INTEGER) DESC LIMIT 1", (err, row) => {
    if (err) {
      console.error("Error fetching next market ID:", err);
      return res.status(500).json({ error: "Database error" });
    }
    const nextId = row && row.id ? (parseInt(row.id, 10) + 1).toString() : "1";
    res.json({ nextId });
  });
}); */
app.get("/api/next-market-id", async (req, res) => {
  try {
    await update();

    const nextId = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM Markets ORDER BY CAST(id AS INTEGER) DESC LIMIT 1",
        (err, row) => {
          if (err) return reject(err);
          const id =
            row && row.id ? (parseInt(row.id, 10) + 1).toString() : "1";
          resolve(id);
        },
      );
    });

    res.json({ nextId });
  } catch (error) {
    console.error("❌ Sync error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
