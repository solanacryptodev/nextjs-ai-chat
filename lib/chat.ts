import { ChatRequest, FunctionCallHandler, nanoid } from "ai";


export const functionCallHandler: FunctionCallHandler = async (
    chatMessages,
    functionCall
) => {
    if ( functionCall.name === 'get_token_name' ) {
        if ( functionCall.arguments ) {
            const parsedFunctionCallArguments: { code: string } = JSON.parse(
                functionCall.arguments,
            );

            console.log( 'parsedFunctionCallArguments', parsedFunctionCallArguments );
        }

        const url = process.env.NEXT_PUBLIC_HELIUS_MAINNET_API as string

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
        // console.log( "Asset in chat.ts: ", result );

        const functionResponse: ChatRequest = {
            messages: [
                ...chatMessages,
                {
                    id: nanoid(),
                    name: 'get_token_name',
                    role: 'function' as const,
                    content: JSON.stringify({
                        tokenName: result!,
                    }),
                },
            ],
        };
        return functionResponse;
    }
};
