import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import SOLANA_TOKENPROGRAM_ID from "../config/consts";

//function to close spl token accounts and transfer remaining SOL

export const collectRemainigSol = async (
  mainKp: Keypair,
  wallets: Keypair[],
) => {
  const solanaConnection = new Connection(process.env.RPC_URL, {
    wsEndpoint: process.env.RPC_WEBSOCKET_ENDPOINT,
  });

  for (const wallet of wallets) {
    try {
      // fetch all the spl token account
      const tokenAccounts =
        await solanaConnection.getParsedTokenAccountsByOwner(wallet.publicKey, {
          programId: SOLANA_TOKENPROGRAM_ID,
        });

      const transaction = new Transaction();

      //closing each token account to reclaim SOL
      for (const { pubKey, account } of tokenAccounts.value) {
        const tokenAmount = account.data.parsed.info.tokenAmount.uiAmount;
        if (tokenAmount === 0) {
          transaction.add(
            Token.createCloseAccountInstruction(
              SOLANA_TOKENPROGRAM_ID,
              pubKey, // The token account to close
              wallet.publicKey, // Destination (wallet itself)
              wallet.publicKey, // Auth
              [],
            ),
          );
        }
      }

      // trnsfering remaining sol to main wallet
      const solBalance = await solanaConnection.getBalance(wallet.publicKey);
      if (solBalance > 0) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: mainKp.publicKey,
            lamports: solBalance - 5000, // Leave some SOL for transaction fee
          }),
        );
      }

      const signature = await solanaConnection.sendTransaction(transaction, [
        wallet,
      ]);
      console.log(
        `Collected SOL from wallet: https://solscan.io/tx/${signature}`,
      );
    } catch (error) {
      console.log(`${error}`);
    }
  }
};
