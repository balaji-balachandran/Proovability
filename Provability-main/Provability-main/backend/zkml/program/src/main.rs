#![no_main]
sp1_zkvm::entrypoint!(main);

use sp1_zkvm::io;
use sha2::{Sha256, Digest};
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

// Helper function to compute Merkle Root of a list of hashes
fn compute_merkle_root(leaves: &[[u8; 32]]) -> [u8; 32] {
    if leaves.is_empty() { return [0u8; 32]; }
    let mut current_level = leaves.to_vec();
    
    while current_level.len() > 1 {
        let mut next_level = Vec::new();
        for chunk in current_level.chunks(2) {
            let mut hasher = Sha256::new();
            hasher.update(chunk[0]);
            // If odd number of nodes, duplicate the last one (standard Merkle practice)
            let right = if chunk.len() > 1 { chunk[1] } else { chunk[0] };
            hasher.update(right);
            next_level.push(hasher.finalize().into());
        }
        current_level = next_level;
    }
    current_level[0]
}

pub fn main() {
    // 1. Read Inputs
    // The PRIVATE list of 10,000 row hashes
    let row_hashes: Vec<[u8; 32]> = io::read();
    // The PUBLIC Random Seed (from Solana)
    let random_seed: [u8; 32] = io::read();
    // The PUBLIC Original Merkle Root (to prevent cheating)
    let expected_root: [u8; 32] = io::read();

    // 2. CONSTRAIN: Verify we are shuffling the correct dataset
    let actual_root = compute_merkle_root(&row_hashes);
    // If this assertion fails, the Proof cannot be generated.
    assert_eq!(actual_root, expected_root);

    // 3. Shuffle (Fisher-Yates) using the specific Seed
    let mut rng = ChaCha8Rng::from_seed(random_seed);
    let mut shuffled = row_hashes.clone();
    // Also track indices so we can tell the client which rows to pick
    let mut indices: Vec<u32> = (0..row_hashes.len() as u32).collect();

    for i in (1..shuffled.len()).rev() {
        let j = rng.gen_range(0..=i);
        shuffled.swap(i, j);
        indices.swap(i, j);
    }

    // 4. Split (80/20)
    let split_point = (shuffled.len() * 8) / 10;
    let (train_hashes, test_hashes) = shuffled.split_at(split_point);
    let (train_indices, _) = indices.split_at(split_point);

    // 5. Compute New Commitments
    let train_root = compute_merkle_root(train_hashes);
    let test_root = compute_merkle_root(test_hashes);

    // 6. Output to the "Journal" (Public Output)
    // These values are revealed to the Smart Contract
    io::commit(&train_root);
    io::commit(&test_root);
    // We commit the indices so the Client knows which rows are "Train"
    io::commit(&train_indices.to_vec());
}