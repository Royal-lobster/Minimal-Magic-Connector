import { createConnector } from "@wagmi/core";
import { Magic } from "magic-sdk";
import { OAuthExtension } from "@magic-ext/oauth";
import { z } from "zod";

const magicConnectorParamsSchema = z.object({
	apiKey: z.string(),
	requestAuthenticationMethod: z.function().returns(
		z.promise(
			z.union([
				z.object({
					provider: z.enum(["google", "discord"]),
				}),
				z.object({
					email: z.string(),
				}),
			]),
		),
	),
});

type MagicConnectorParams = z.infer<typeof magicConnectorParamsSchema>;

export function magicConnector(parameters: MagicConnectorParams) {
	return createConnector((config) => {
		const options = magicConnectorParamsSchema.parse(parameters);

		const magic = new Magic(options.apiKey, {
			extensions: [new OAuthExtension()],
			deferPreload: true,
			network: {
				chainId: config.chains[0].id,
				rpcUrl: config.chains[0].rpcUrls.default.http as unknown as string,
			},
		});

		return {
			id: "magic",
			name: "Magic",
			type: "Magic",
			connect: async () => {
				const method = await parameters.requestAuthenticationMethod();
				const isLoggedIn = await magic.user.isLoggedIn();

				if (!isLoggedIn) {
					if ("email" in method) {
						await magic.auth.loginWithMagicLink({ email: method.email });
					} else {
						await magic.oauth.loginWithRedirect({
							provider: method.provider,
							redirectURI: window.location.origin,
						});
					}
				}

				const metadata = await magic.user.getMetadata();
				const publicAddress = metadata.publicAddress as `0x${string}`;

				if (!publicAddress) {
					throw new Error("No public address found");
				}

				return {
					accounts: [publicAddress],
					chainId: config.chains[0].id,
				};
			},
			disconnect: async () => {
				await magic.user.logout();
			},
			getAccounts: async () => {
				const accounts = await magic.user.getMetadata();
				const publicAddress = accounts.publicAddress as `0x${string}`;
				if (!publicAddress) {
					throw new Error("No public address found");
				}
				return [publicAddress];
			},
			getChainId: async () => {
				return config.chains[0].id;
			},
			getProvider: async () => {
				return magic.rpcProvider;
			},
			isAuthorized: async () => {
				return await magic.user.isLoggedIn();
			},
			onAccountsChanged: async () => {},
			onChainChanged: async () => {},
			onDisconnect: async () => {},
			onConnect: async () => {
				await magic.oauth.getRedirectResult();
			},
		};
	});
}
