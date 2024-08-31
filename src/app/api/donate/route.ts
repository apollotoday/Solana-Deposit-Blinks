import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from "@solana/actions";

import { PublicKey } from "@solana/web3.js";

interface ApiResponse {
  data: {
    transactionMeta: {
      transaction: string;
    }[];
  };
}

interface TokenInfo {
  mintAddress: string;
  name: string;
}

const TOKENS: { [key: string]: TokenInfo } = {
  USDC: {
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    name: "USDC",
  },
  USDT: {
    mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    name: "USDT",
  },
  PaypalUSD: {
    mintAddress: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    name: "PaypalUSD",
  },
};

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const payload: ActionGetResponse = {
    icon: "https://i.ibb.co/m6WD3dX/blink.jpg",
    title: "Deposit on Lulo",
    description: "Note: This is an independent project, built externally as a token of appreciation for the Lulo team.",
    label: "Deposit",
    links: {
      actions: [
        {
          label: "Deposit",
          href: `${url.origin}${url.pathname}?amount={amount}&token={token}`,
          parameters: [
            {
              name: "amount",
              label: "Amount",
              required: true,
            },
            {
              name: "token",
              label: "Token",
              required: true,
              type: "select",
              options: Object.keys(TOKENS).map(token => ({
                label: TOKENS[token].name,
                value: token,
              })),
            },
          ],
        },
      ],
    },
  };

  console.log("Test:", payload.links?.actions[0].href);

  return new Response(JSON.stringify(payload), {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export const OPTIONS = GET;

export async function POST(request: Request): Promise<Response> {
  let body: ActionPostRequest;
  let amount: number;
  let sender: PublicKey;
  let token: string;

  try {
    body = (await request.json()) as ActionPostRequest;
    const url = new URL(request.url);
    amount = parseInt(url.searchParams.get("amount") as string);
    token = url.searchParams.get("token") as string;
    console.log("Amount:", amount, "Token:", token);
    sender = new PublicKey(body.account);

    if (!TOKENS[token]) {
      throw new Error("Invalid token");
    }
  } catch (error) {
    console.error("Error parsing request or initializing PublicKey:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: "Invalid account, token, or request parameters",
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
    mintAddress: TOKENS[token].mintAddress,
    depositAmount: amount.toString(),
  };

  let apiResponse: Response;

  try {
    apiResponse = await fetch(
      `https://api.flexlend.fi/generate/account/deposit?priorityFee=50000`,
      {
        method: "POST",
        //@ts-ignore
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-wallet-pubkey": sender.toString(),
          "x-api-key": process.env.FLEXLEND_API_KEY,
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
    message: `Transaction created successfully for ${amount} ${TOKENS[token].name}`,
  };

  console.log(payload);

  return new Response(JSON.stringify(payload), {
    headers: ACTIONS_CORS_HEADERS,
  });
}