import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { readFileSync } from "fs";
import crypto from "crypto";
import * as borsh from "borsh";
import { BountyEscrow } from "./target/types/bounty_escrow";

// --- Manual Borsh Schema for TEE Payload ---
class AttestedResult {
  bounty: Uint8Array;
  submission: Uint8Array;
  solver: Uint8Array;
  predsHash: number[];
  pass: boolean;
  testsetCommitment: number[];
  evalSpecHash: number[];
  n: number;
  scale: number;
  thresholdT2: bigint;

  constructor(fields: any) {
    Object.assign(this, fields);
  }
}

const schema = {
  struct: {
    bounty: { array: { type: 'u8', len: 32 } },
    submission: { array: { type: 'u8', len: 32 } },
    solver: { array: { type: 'u8', len: 32 } },
    predsHash: { array: { type: 'u8', len: 32 } },
    pass: 'bool',
    testsetCommitment: { array: { type: 'u8', len: 32 } },
    evalSpecHash: { array: { type: 'u8', len: 32 } },
    n: 'u32',
    scale: 'u32',
    thresholdT2: 'u128',
  },
};

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))));
}

async function main() {
  // 1. Setup Provider & Program
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const creatorKp = loadKeypair(process.env.CREATOR_KEYPAIR ?? `${process.env.HOME}/.config/solana/id.json`);
  const solverKp = loadKeypair(process.env.SOLVER_KEYPAIR ?? `${process.env.HOME}/.config/solana/solver.json`);

  // We'll use the creator as the primary provider for setup, then solver for submission
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(creatorKp), { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = anchor.workspace.BountyEscrow as Program<BountyEscrow>;

  console.log("Program ID:", program.programId.toBase58());

  // --- STEP 1: CREATE BOUNTY ---
  const bountySeed = Array.from(crypto.randomBytes(16));
  const [bountyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bounty_state"), creatorKp.publicKey.toBuffer(), Buffer.from(bountySeed)],
    program.programId
  );

  console.log("\n1. Creating Bounty...");
  const createTx = await program.methods
    .createBounty({
      seed: bountySeed,
      amountLamports: new anchor.BN(0.05 * LAMPORTS_PER_SOL),
      deadlineTs: new anchor.BN(Math.floor(Date.now() / 1000) + 3600),
      n: 100,
      scale: 10,
      thresholdT2: new anchor.BN(50),
      evalSpecHash: Array.from(crypto.randomBytes(32)),
      testsetCommitment: Array.from(crypto.randomBytes(32)),
      allowedMeasurement: Array.from(crypto.randomBytes(32)),
      allowedAttester: creatorKp.publicKey,
    })
    .accounts({ creator: creatorKp.publicKey })
    .rpc();
  console.log("   Success! Bounty PDA:", bountyPda.toBase58());

  // --- STEP 2: SUBMIT (Switch to Solver) ---
  const solverProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(solverKp), { commitment: "confirmed" });
  const solverProgram = new Program(program.idl, solverProvider);

  const predsHash = Array.from(crypto.randomBytes(32));
  const [submissionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("submission"), bountyPda.toBuffer(), solverKp.publicKey.toBuffer()],
    program.programId
  );

  console.log("\n2. Submitting Solution...");
  await solverProgram.methods
    .submit(predsHash, "https://my-data-uri.com/results")
    .accounts({
      solver: solverKp.publicKey,
      bounty: bountyPda,
    })
    .rpc();
  console.log("   Success! Submission PDA:", submissionPda.toBase58());

  // --- STEP 3: FINALIZE WITH ATTESTATION ---
  const bountyData = await program.account.bounty.fetch(bountyPda);
  
  const attestedResult = new AttestedResult({
    bounty: bountyPda.toBytes(),
    submission: submissionPda.toBytes(),
    solver: solverKp.publicKey.toBytes(),
    predsHash: predsHash,
    pass: true,
    testsetCommitment: Array.from(bountyData.testsetCommitment),
    evalSpecHash: Array.from(bountyData.evalSpecHash),
    n: bountyData.n,
    scale: bountyData.scale,
    thresholdT2: BigInt(bountyData.thresholdT2.toString()),
  });

  const payload = borsh.serialize(schema, attestedResult);

  console.log("\n3. Finalizing Payout...");
  try {
    const finalizeTx = await solverProgram.methods
      .finalizeWithAttestation(Buffer.from(payload), Buffer.from("mock_attestation"))
      .accounts({
        bounty: bountyPda,
        submission: submissionPda,
        solver: solverKp.publicKey,
        attestationVerifier: PublicKey.default,
        systemProgram: SystemProgram.programId,
        // vault is auto-resolved by Anchor seeds
      } as any)
      .rpc();
    
    console.log("   ✅ Payout Successful! TX:", finalizeTx);
  } catch (e: any) {
    console.error("   ❌ Finalize Failed:", e.logs || e);
  }
}

main().catch(console.error);