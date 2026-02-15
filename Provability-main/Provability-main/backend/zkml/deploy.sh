#!/bin/bash
set -e

echo "==================================="
echo "ZKML Dataset Commitment Deployment"
echo "==================================="

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Install it first:"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Install it first:"
    echo "   cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked"
    exit 1
fi

# Check Solana configuration
echo ""
echo "📋 Solana Configuration:"
solana config get

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo ""
echo "💰 Wallet Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo "⚠️  Low balance! Request airdrop with:"
    echo "   solana airdrop 2"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build and deploy Anchor program
echo ""
echo "🔨 Building Anchor program..."
cd contracts
anchor build

echo ""
echo "🚀 Deploying to Solana..."
DEPLOY_OUTPUT=$(anchor deploy 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract program ID
PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')

if [ -z "$PROGRAM_ID" ]; then
    echo "❌ Failed to extract Program ID from deployment output"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo "Program ID: $PROGRAM_ID"

# Update program ID in files
echo ""
echo "📝 Updating Program ID in source files..."

# Update lib.rs
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/declare_id!(\".*\");/declare_id!(\"$PROGRAM_ID\");/" programs/zkml/src/lib.rs
else
    # Linux
    sed -i "s/declare_id!(\".*\");/declare_id!(\"$PROGRAM_ID\");/" programs/zkml/src/lib.rs
fi

# Update main.rs
cd ../script/src
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/Pubkey::from_str(\".*\")/Pubkey::from_str(\"$PROGRAM_ID\")/" main.rs
else
    sed -i "s/Pubkey::from_str(\".*\")/Pubkey::from_str(\"$PROGRAM_ID\")/" main.rs
fi

cd ../..

echo "✅ Source files updated with new Program ID"
echo ""
echo "🎉 Setup complete! Next steps:"
echo "   1. Prepare your datasets in backend/test_data/"
echo "   2. Run the client: cd script && cargo run --release"
echo ""
echo "Program ID: $PROGRAM_ID"
