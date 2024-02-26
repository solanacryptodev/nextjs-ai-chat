import { kv } from '@vercel/kv'
import { CreateMessage, OpenAIStream, StreamingTextResponse } from 'ai'
import OpenAI from 'openai'
import type { ChatCompletionCreateParams } from 'openai/resources/chat';

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'

export const runtime = 'edge'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const functions: ChatCompletionCreateParams.Function[] = [
  {
    name: 'get_token_name',
    description: 'Tell me the token name.',
    parameters: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'The token name.',
        },
      },
      required: ['format'],
    },
  },
];

export async function POST(req: Request) {
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = (await auth())?.user.id

  // if (!userId) {
  //   return new Response('Unauthorized', {
  //     status: 401
  //   })
  // }

  if (previewToken) {
    openai.apiKey = previewToken
  }

  const res = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    functions,
    temperature: 0.7,
    stream: true
  })

  const url = process.env.HELIUS_SECURE_KEY as string
  const response = await fetch( url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify( {
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAsset',
      params: {
        id: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        displayOptions: {
          showFungible: true
        }
      },
    } ),
  } );
  const { result } = await response.json();

  const stream = OpenAIStream(res, {
    experimental_onFunctionCall: async ({ name, arguments: args }, createFunctionCallMessages ) => {
      if ( name === 'get_token_name' ) {

        const tokenName = {
          tokenName: result!,
          // context: vectorData!
        }

        const newMessages: CreateMessage[] = createFunctionCallMessages(tokenName);
        return openai.chat.completions.create({
          messages: [...messages, ...newMessages],
          stream: true,
          model: 'gpt-3.5-turbo',
        });
      }
    },
    async onCompletion(completion) {
      const title = json.messages[0].content.substring(0, 100)
      const id = json.id ?? nanoid()
      const createdAt = Date.now()
      const path = `/chat/${id}`
      const payload = {
        id,
        title,
        userId,
        createdAt,
        path,
        messages: [
          ...messages,
          {
            content: completion,
            role: 'assistant'
          }
        ]
      }
      // await kv.hmset(`chat:${id}`, payload)
      // await kv.zadd(`user:chat:${userId}`, {
      //   score: createdAt,
      //   member: `chat:${id}`
      // })
    },
  })

  return new StreamingTextResponse(stream)
}
