import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  createPostResponse,
} from "@solana/actions";

import {
  Connection,
  PublicKey,
  clusterApiUrl,
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
  Transaction,
} from "@solana/web3.js";

interface ApiResponse {
  data: {
    transactionMeta: {
      transaction: string;
    }[];
  };
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const payload: ActionGetResponse = {
    icon: "https://lulo.fi/favicon.ico",
    title: "Deposit USDC on Lulo",
    description: "Deposit USDC on Lulo.",
    label: "Deposit",
    links: {
      actions: [
        {
          label: "Deposit",
          href: `${url.href}?amount=10`,
          parameters: [
            {
              name: "amountInUSDC",
              label: "USDC",
              required: true,
            },
          ],
        },
      ],
    },
  };
  return new Response(JSON.stringify(payload), {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export const OPTIONS = GET;

export async function POST(request: Request): Promise<Response> {
  let body: ActionPostRequest;
  let amount: number;
  let sender: PublicKey;

  try {
    body = (await request.json()) as ActionPostRequest;
    const url = new URL(request.url);
    amount = 10;

    sender = new PublicKey(body.account);
  } catch (error) {
    console.error("Error parsing request or initializing PublicKey:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: "Invalid account or request parameters",
        },
      }),
      {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  }

  const requestBody = {
    owner: sender.toString(),
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    depositAmount: amount.toString(),
  };

  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      `https://api.flexlend.fi/generate/account/deposit?priorityFee=50000`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-wallet-pubkey": sender.toString(),
          "x-api-key":
            process.env.FLEXLEND_API_KEY ||
            "4b8857f7-dd50-4c74-802f-342d02881f1d",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!apiResponse.ok) {
      throw new Error(`API response status: ${apiResponse.status}`);
    }
  } catch (error) {
    console.error("Error making API request:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: "Failed to create deposit transaction",
        },
      }),
      {
        status: 500,
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  }

  let transactionMeta: string;

  try {
    const apiResponseBody = (await apiResponse.json()) as ApiResponse;
    transactionMeta = apiResponseBody.data.transactionMeta[0].transaction;
  } catch (error) {
    console.error("Error parsing API response:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: "Invalid response from deposit API",
        },
      }),
      {
        status: 500,
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  }

  const payload: ActionPostResponse = {
    transaction: transactionMeta,
    message: "Transaction created successfully",
  };

  return new Response(JSON.stringify(payload), {
    headers: ACTIONS_CORS_HEADERS,
  });
}