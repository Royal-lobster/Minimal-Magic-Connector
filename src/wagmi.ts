import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { magicConnector } from "./magicConnector";

export const config = createConfig({
	chains: [mainnet],
	connectors: [
		injected(),
		magicConnector({
			apiKey: process.env.NEXT_PUBLIC_MAGIC_API_KEY as string,
			requestAuthenticationMethod: async () => ({
				provider: "google",
			}),
		}),
	],
	transports: {
		[mainnet.id]: http(),
	},
});

declare module "wagmi" {
	interface Register {
		config: typeof config;
	}
}
