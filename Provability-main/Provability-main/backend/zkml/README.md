# ZKML Dataset Commitment (Simplified MVP)

This is a simplified version that commits dataset hashes (Merkle roots) to Solana, without the complexity of ZK proof generation.

## Architecture

### What it does:
1. **Hash Datasets**: Computes Merkle roots of training and test datasets
2. **Commit to Solana**: Stores these hashes on-chain as immutable commitments
3. **Verify Later**: Anyone can verify that claimed datasets match the committed hashes

### What it does NOT do (removed for MVP):
- ~~Generate ZK proofs of computation~~
- ~~Prove correct train/test split~~
- ~~Verify shuffling logic~~

## Project Structure

```
backend/zkml/
├── contracts/          # Solana program (Anchor)
│   └── programs/zkml/
│       └── src/lib.rs  # Dataset commitment contract
├── script/             # Rust client
│   └── src/main.rs     # Computes hashes and submits to Solana
└── program/            # (Not used in simplified version)
```

## Setup

### 1. Install Dependencies

```bash
# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Anchor (for deploying Solana program)
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### 2. Configure Solana

```bash
# Set to devnet
solana config set --url https://api.devnet.solana.com

# Create or use existing wallet
solana-keygen new

# Airdrop some SOL for testing
solana airdrop 2
```

### 3. Prepare Your Datasets

Place your CSV files in the expected location:
```
backend/test_data/
├── mnist_train.csv
└── mnist_test.csv
```

Or modify the paths in `script/src/main.rs`.

## Usage

### Step 1: Build and Deploy Solana Program

```bash
cd contracts
anchor build
anchor deploy

# Note the Program ID from the output and update it in:
# - contracts/programs/zkml/src/lib.rs (declare_id!)
# - script/src/main.rs (submit_to_solana function)
```

### Step 2: Run the Client

```bash
cd ../script
cargo run --release
```

This will:
1. Read your train and test CSV files
2. Hash each row
3. Compute Merkle roots for train and test sets
4. Submit the roots to Solana
5. Print the transaction signature

### Step 3: Verify

You can view the transaction on Solana Explorer:
```
https://explorer.solana.com/tx/<signature>?cluster=devnet
```

## How It Works

### Hashing Process

1. **Row Hashing**: Each CSV row (e.g., MNIST pixel values) is hashed with SHA256
2. **Merkle Tree**: All row hashes are combined into a Merkle tree
3. **Root Hash**: The Merkle root serves as a commitment to the entire dataset

### Solana Program

The Anchor program stores:
- `train_root`: Merkle root of training dataset
- `test_root`: Merkle root of test dataset
- `authority`: Pubkey of who committed the data
- `timestamp`: When the commitment was made

### Why This Works for MVP

- **Immutable Commitment**: Once committed, the dataset can't be changed
- **Verifiable**: Anyone can rehash your published dataset and verify it matches
- **Fast**: No expensive ZK proof generation (seconds instead of minutes)
- **Simple**: Easy to understand and audit

## Future Enhancements

When ready to add ZK proofs back:
1. Prove that train/test split was done correctly
2. Prove the shuffling used a specific random seed
3. Prove the ML training used exactly these datasets

## Troubleshooting

### "Failed to read keypair"
Make sure you have a Solana wallet configured:
```bash
solana-keygen new
```

### "Error reading CSV"
Check that your CSV files exist and the paths in `main.rs` are correct.

### "Transaction failed"
- Ensure you have SOL: `solana balance`
- Check the program ID matches your deployed program
- Verify you're on the right cluster: `solana config get`

## Testing

```bash
# Run tests (if any)
cd script
cargo test

# Or deploy to localnet for testing
solana-test-validator  # In one terminal
# Then deploy and run in another terminal
```
