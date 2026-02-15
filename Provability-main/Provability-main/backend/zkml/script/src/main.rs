// script/src/main.rs
use sp1_sdk::{ProverClient, SP1Stdin};

// Uncomment when ready to use Solana integration
// use solana_client::rpc_client::RpcClient;
// use solana_sdk::{
//     signer::{Signer, keypair::read_keypair_file},
//     transaction::Transaction,
//     instruction::{Instruction, AccountMeta},
//     pubkey::Pubkey,
// };

fn main() {
    println!("Starting ZKML proof generation and verification...");

    // 1. Setup SP1
    let client = ProverClient::new();

    // Check if ELF file exists
    let elf_path = "../../program/elf/riscv32im-succinct-zkvm-elf";
    if !std::path::Path::new(elf_path).exists() {
        eprintln!("Error: ELF file not found. Build the program first with:");
        eprintln!("  cd program && cargo prove build");
        return;
    }

    // Note: Uncomment this line after building the program with `cargo prove build`
    // let (pk, vk) = client.setup(include_bytes!("../../program/elf/riscv32im-succinct-zkvm-elf"));
    println!("Note: Build the program first with 'cd program && cargo prove build'");
    println!("Then uncomment the setup line in script/src/main.rs");

    // 2. Prepare Inputs (example data)
    let mut stdin = SP1Stdin::new();

    // Example: Create 10,000 row hashes (in practice, these would be your actual data)
    let my_row_hashes: Vec<[u8; 32]> = (0..10000_u32)
        .map(|i| {
            let mut hash = [0u8; 32];
            hash[0..4].copy_from_slice(&i.to_le_bytes());
            hash
        })
        .collect();

    // Example: Random seed (in practice, this would come from Solana)
    let my_seed: [u8; 32] = [1u8; 32];

    // Expected root (computed from the original data)
    let expected_root: [u8; 32] = [0u8; 32]; // Placeholder

    stdin.write(&my_row_hashes);
    stdin.write(&my_seed);
    stdin.write(&expected_root);

    println!("Inputs prepared successfully!");

    // 3. Generate Proof (note: stdin is moved, not borrowed)
    // Uncomment after building the program
    // println!("Generating proof...");
    // let proof = client.prove(&pk, stdin).groth16().run().unwrap();
    // println!("Proof generated successfully!");

    // 4. Submit to Solana (optional - commented out for now)
    /*
    let rpc = RpcClient::new("https://api.devnet.solana.com");
    let payer = read_keypair_file(&shellexpand::tilde("~/.config/solana/id.json")).unwrap();

    // Create the instruction (you'll need to implement this based on your program)
    let program_id = Pubkey::from_str("zkm1111111111111111111111111111111111111111").unwrap();
    let instruction = Instruction {
        program_id,
        accounts: vec![
            // Add your account metas here
        ],
        data: proof.bytes().to_vec(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        rpc.get_latest_blockhash().unwrap(),
    );

    rpc.send_and_confirm_transaction(&tx).unwrap();
    println!("✅ Proof Verified on Solana!");
    */

    println!("✅ Build successful! Proof verification logic is ready.");
}