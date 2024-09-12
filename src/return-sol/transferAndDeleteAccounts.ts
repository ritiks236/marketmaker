import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import "dotenv/config";
import fs from "fs";
import bs58 from "bs58";
import { AccountInfo } from "../types/types";
import { transactionLogger } from "../utils/logger";

const url = "https://api.devnet.solana.com";

const connection = new Connection(url, "confirmed");

const mainWallet = new PublicKey(process.env.WALLET_PUBLIC_KEY);

const accounts: AccountInfo[] = JSON.parse(
  fs.readFileSync("data.json", "utf-8"),
);

function getKeypairFromPrivateKey(privateKey: string): Keypair {
  const secretKey = bs58.decode(privateKey);
  return Keypair.fromSecretKey(secretKey);
}

//function to transfer sol and mark for delete

async function transferAndDeleteAccounts() {
  try {
    while (accounts[0]) {
      const fromKeypair = getKeypairFromPrivateKey(accounts[0].privateKey);
      const toPublicKey = mainWallet;

      const fromBalance = await connection.getBalance(fromKeypair.publicKey);

      const transferAmount = fromBalance - 5000;
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: transferAmount,
        }),
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [fromKeypair],
      );
      transactionLogger.info(
        `Transferred ${transferAmount / LAMPORTS_PER_SOL} SOL from ${fromKeypair.publicKey.toBase58()}, Signature: ${signature}`,
      );

      fs.writeFileSync("data.json", JSON.stringify(accounts.shift(), null, 2));
      console.log("Updated data.json with remaining accounts.");
    }
  } catch (error) {
    console.error(`Failed to process account ${accounts[0].pubkey} `, error);
    return error;
  }
}

transferAndDeleteAccounts()
  .then(() => {
    console.log("Transfer and delete accounts completed.");
  })
  .catch((error) => {
    console.error("An error occurred:", error);
  });
