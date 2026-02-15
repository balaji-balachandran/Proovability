use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Dxe3XL6avseuxgpQy2WLQgv5KDLBXkcsnKy7cNMV11bh");

#[program]
pub mod bounty_escrow {
    use super::*;

    pub fn create_bounty(ctx: Context<CreateBounty>, params: CreateBountyParams) -> Result<()> {
        require!(params.deadline_ts > Clock::get()?.unix_timestamp, ErrorCode::BadDeadline);
        require!(params.amount_lamports > 0, ErrorCode::BadAmount);

        let bounty = &mut ctx.accounts.bounty;
        bounty.creator = ctx.accounts.creator.key();
        bounty.vault = ctx.accounts.vault.key();
        bounty.amount_lamports = params.amount_lamports;
        bounty.deadline_ts = params.deadline_ts;
        bounty.n = params.n;
        bounty.scale = params.scale;
        bounty.threshold_t2 = params.threshold_t2;
        bounty.eval_spec_hash = params.eval_spec_hash;
        bounty.testset_commitment = params.testset_commitment;
        bounty.allowed_measurement = params.allowed_measurement;
        bounty.allowed_attester = params.allowed_attester;
        bounty.is_paid = false;
        
        // Capture the canonical bump found by Anchor
        bounty.vault_bump = ctx.bumps.vault; 

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            params.amount_lamports,
        )?;

        Ok(())
    }

    pub fn submit(ctx: Context<Submit>, preds_hash: [u8; 32], uri: String) -> Result<()> {
        let bounty = &ctx.accounts.bounty;
        require!(!bounty.is_expired()?, ErrorCode::Expired);

        let sub = &mut ctx.accounts.submission;
        sub.bounty = bounty.key();
        sub.solver = ctx.accounts.solver.key();
        sub.preds_hash = preds_hash;
        sub.uri = uri;
        sub.created_ts = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn finalize_with_attestation(
        ctx: Context<FinalizeWithAttestation>,
        attested_payload: Vec<u8>,
        _attestation_blob: Vec<u8>,
    ) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(!bounty.is_paid, ErrorCode::AlreadyPaid);
        require!(!bounty.is_expired()?, ErrorCode::Expired);

        let p = AttestedResult::try_from_slice(&attested_payload)
            .map_err(|_| error!(ErrorCode::BadPayload))?;

        require!(p.bounty == bounty.key(), ErrorCode::BadPayload);
        require!(p.submission == ctx.accounts.submission.key(), ErrorCode::BadPayload);
        require!(p.pass, ErrorCode::DidNotPass);

        // Vault PDA signs the transfer
        let bounty_key = bounty.key();
        let seeds: &[&[u8]] = &[
            b"vault",
            bounty_key.as_ref(),
            &[bounty.vault_bump],
        ];
        let signer = &[seeds];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.solver.to_account_info(),
                },
                signer,
            ),
            bounty.amount_lamports,
        )?;

        bounty.is_paid = true;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(params: CreateBountyParams)]
pub struct CreateBounty<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + Bounty::SIZE,
        seeds = [b"bounty_state", creator.key().as_ref(), params.seed.as_ref()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,

    /// CHECK: PDA vault that holds SOL. Verified by seeds and bump.
    #[account(
        mut,
        seeds = [b"vault", bounty.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Submit<'info> {
    #[account(mut)]
    pub solver: Signer<'info>,
    pub bounty: Account<'info, Bounty>,
    #[account(
        init,
        payer = solver,
        space = 8 + Submission::SIZE,
        seeds = [b"submission", bounty.key().as_ref(), solver.key().as_ref()],
        bump
    )]
    pub submission: Account<'info, Submission>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeWithAttestation<'info> {
    #[account(mut)]
    pub bounty: Account<'info, Bounty>,

    /// CHECK: Vault PDA verified by seeds and stored bump.
    #[account(
        mut,
        seeds = [b"vault", bounty.key().as_ref()],
        bump = bounty.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    pub submission: Account<'info, Submission>,

    #[account(mut)]
    pub solver: Signer<'info>,

    /// CHECK: Placeholder for TEE verification logic.
    pub attestation_verifier: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Bounty {
    pub creator: Pubkey,
    pub vault: Pubkey,
    pub amount_lamports: u64,
    pub deadline_ts: i64,
    pub n: u32,
    pub scale: u32,
    pub threshold_t2: u128,
    pub eval_spec_hash: [u8; 32],
    pub testset_commitment: [u8; 32],
    pub allowed_measurement: [u8; 32],
    pub allowed_attester: Pubkey,
    pub is_paid: bool,
    pub vault_bump: u8,
}

impl Bounty {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 4 + 4 + 16 + 32 + 32 + 32 + 32 + 1 + 1;
    pub fn is_expired(&self) -> Result<bool> {
        Ok(Clock::get()?.unix_timestamp > self.deadline_ts)
    }
}

#[account]
pub struct Submission {
    pub bounty: Pubkey,
    pub solver: Pubkey,
    pub preds_hash: [u8; 32],
    pub uri: String,
    pub created_ts: i64,
}

impl Submission {
    pub const SIZE: usize = 32 + 32 + 32 + (4 + 200) + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateBountyParams {
    pub seed: [u8; 16],
    pub amount_lamports: u64,
    pub deadline_ts: i64,
    pub n: u32,
    pub scale: u32,
    pub threshold_t2: u128,
    pub eval_spec_hash: [u8; 32],
    pub testset_commitment: [u8; 32],
    pub allowed_measurement: [u8; 32],
    pub allowed_attester: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AttestedResult {
    pub bounty: Pubkey,
    pub submission: Pubkey,
    pub solver: Pubkey,
    pub preds_hash: [u8; 32],
    pub pass: bool,
    pub testset_commitment: [u8; 32],
    pub eval_spec_hash: [u8; 32],
    pub n: u32,
    pub scale: u32,
    pub threshold_t2: u128,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Bad deadline")] BadDeadline,
    #[msg("Bad amount")] BadAmount,
    #[msg("Bounty expired")] Expired,
    #[msg("Already paid")] AlreadyPaid,
    #[msg("Bad payload")] BadPayload,
    #[msg("Bad attestation")] BadAttestation,
    #[msg("Did not pass threshold")] DidNotPass,
}