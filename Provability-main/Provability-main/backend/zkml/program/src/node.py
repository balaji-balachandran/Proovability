import sp1_sdk
import json
from solana.rpc.api import Client

def run_shuffle_proof(row_hashes, solana_seed, original_root):
    # 1. Initialize SP1 Prover
    client = sp1_sdk.ProverClient()
    
    # 2. Prepare Inputs
    # We write these into the ZKVM's memory
    stdin = sp1_sdk.SP1Stdin()
    stdin.write(row_hashes)     # Private
    stdin.write(solana_seed)    # Public
    stdin.write(original_root)  # Public

    # 3. GENERATE PROOF (The Heavy Lifting)
    # This runs the Rust code above and generates the cryptographic trace
    print("Generating proof... this takes ~30s")
    proof = client.prove(
        program_elf_bytes,  # The compiled Rust binary
        stdin
    )

    # 4. Extract Results
    train_root = proof.public_values.read()
    test_root = proof.public_values.read()
    train_indices = proof.public_values.read()
    
    # 5. Submit to Solana (Pseudo-code)
    # calls: contract.submit_split(proof_bytes, train_root, test_root)
    submit_tx_to_solana(proof.bytes(), train_root, test_root)

    return train_indices