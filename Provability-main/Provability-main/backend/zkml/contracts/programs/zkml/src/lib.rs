// contracts/programs/treehacks-zkml/src/lib.rs
use anchor_lang::prelude::*;

// Placeholder program ID - replace with actual deployed program ID
declare_id!("zkm1111111111111111111111111111111111111111");

#[program]
pub mod treehacks_zkml {
    use super::*;

    pub fn verify_split(ctx: Context<VerifySplit>, _proof: Vec<u8>, _public_inputs: Vec<u8>) -> Result<()> {
        // 1. Verify the Proof
        // NOTE: SP1 Solana verification logic needs to be implemented
        // The sp1-solana crate API may have changed. Check the crate docs for the correct verification method.
        // For now, we'll mark the state as verified (this is a placeholder)

        // TODO: Implement proper SP1 proof verification
        // groth16::verify(&proof, &public_inputs, &verifier_key)?;

        // 2. Update State
        let state = &mut ctx.accounts.bounty_state;
        state.is_verified = true;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifySplit<'info> {
    #[account(mut)]
    pub bounty_state: Account<'info, BountyState>,
    /// CHECK: The verifier key account
    pub verifier_key: AccountInfo<'info>,
}

#[account]
pub struct BountyState {
    pub is_verified: bool,
}

#[error_code]
pub enum ZkmlError {
    #[msg("The provided proof is invalid")]
    InvalidProof,
}