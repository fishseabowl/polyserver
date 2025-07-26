const polycoinAbi = [
  {
    type: "impl",
    name: "Polycoin",
    interface_name: "polycoin::polycoin::IPolyCoin",
  },
  {
    type: "enum",
    name: "core::bool",
    variants: [
      {
        name: "False",
        type: "()",
      },
      {
        name: "True",
        type: "()",
      },
    ],
  },
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      {
        name: "low",
        type: "core::integer::u128",
      },
      {
        name: "high",
        type: "core::integer::u128",
      },
    ],
  },
  {
    type: "struct",
    name: "polycoin::polycoin::PolyCoin::Bet",
    members: [
      {
        name: "bet_user",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "amount",
        type: "core::integer::u256",
      },
      {
        name: "timestamp",
        type: "core::integer::u64",
      },
      {
        name: "yes_or_not",
        type: "core::integer::u8",
      },
    ],
  },
  {
    type: "struct",
    name: "polycoin::polycoin::PolyCoin::QuestionOutput",
    members: [
      {
        name: "id",
        type: "core::integer::u64",
      },
      {
        name: "question_title_hash",
        type: "core::felt252",
      },
      {
        name: "timestamp",
        type: "core::integer::u64",
      },
      {
        name: "expired_time",
        type: "core::integer::u64",
      },
      {
        name: "created_by",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "bets",
        type: "core::array::Array::<polycoin::polycoin::PolyCoin::Bet>",
      },
    ],
  },
  {
    type: "interface",
    name: "polycoin::polycoin::IPolyCoin",
    items: [
      {
        type: "function",
        name: "create_question",
        inputs: [
          {
            name: "question_title_hash",
            type: "core::felt252",
          },
          {
            name: "timestamp",
            type: "core::integer::u64",
          },
          {
            name: "expired_time",
            type: "core::integer::u64",
          },
          {
            name: "created_by",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "list",
        inputs: [],
        outputs: [
          {
            type: "core::array::Array::<polycoin::polycoin::PolyCoin::QuestionOutput>",
          },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "add_bets",
        inputs: [
          {
            name: "user",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "id",
            type: "core::integer::u64",
          },
          {
            name: "question_title_hash",
            type: "core::felt252",
          },
          {
            name: "bet_timestamp",
            type: "core::integer::u64",
          },
          {
            name: "amount",
            type: "core::integer::u256",
          },
          {
            name: "yes_or_no",
            type: "core::integer::u8",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "distribute_winning_amount",
        inputs: [
          {
            name: "id",
            type: "core::integer::u64",
          },
          {
            name: "winning_bet_option",
            type: "core::integer::u8",
          },
          {
            name: "timestamp",
            type: "core::integer::u64",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "external",
      },
    ],
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    type: "event",
    name: "polycoin::polycoin::PolyCoin::QuestionCreated",
    kind: "struct",
    members: [
      {
        name: "id",
        type: "core::integer::u64",
        kind: "data",
      },
      {
        name: "question_title_hash",
        type: "core::felt252",
        kind: "data",
      },
      {
        name: "timestamp",
        type: "core::integer::u64",
        kind: "data",
      },
      {
        name: "end_timestamp",
        type: "core::integer::u64",
        kind: "data",
      },
      {
        name: "created_by",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data",
      },
    ],
  },
  {
    type: "event",
    name: "polycoin::polycoin::PolyCoin::BetAdded",
    kind: "struct",
    members: [
      {
        name: "id",
        type: "core::integer::u64",
        kind: "data",
      },
      {
        name: "question_title_hash",
        type: "core::felt252",
        kind: "data",
      },
      {
        name: "bet_user",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data",
      },
      {
        name: "amount",
        type: "core::integer::u256",
        kind: "data",
      },
      {
        name: "bet_timestamp",
        type: "core::integer::u64",
        kind: "data",
      },
      {
        name: "yes_or_not",
        type: "core::integer::u8",
        kind: "data",
      },
    ],
  },
  {
    type: "event",
    name: "polycoin::polycoin::PolyCoin::Event",
    kind: "enum",
    variants: [
      {
        name: "QuestionCreated",
        type: "polycoin::polycoin::PolyCoin::QuestionCreated",
        kind: "nested",
      },
      {
        name: "BetAdded",
        type: "polycoin::polycoin::PolyCoin::BetAdded",
        kind: "nested",
      },
    ],
  },
];

module.exports = { polycoinAbi };
