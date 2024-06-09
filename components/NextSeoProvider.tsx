import { NextSeo } from 'next-seo';
import { envConfig } from '../app.env.config';

export default function NextSeoProvider() {
	return (
		<NextSeo
			title={envConfig.AppName}
			description={`The ${envConfig.AppName} is a collateralized, oracle-free stablecoin that tracks the value of the Swiss franc.`}
			openGraph={{
				type: 'website',
				locale: 'en_US',
				url: 'https://app.frankencoin.com/',
				// images: [
				//   {
				//     url: "https://frankencoin.com//splash.png",
				//     width: 1670,
				//     height: 1158,
				//     alt: "landing page preview",
				//   },
				// ],
			}}
			twitter={{
				handle: '@frankencoinzchf',
				site: '@frankencoinzchf',
				cardType: 'summary_large_image',
			}}
			themeColor="#d35384"
			additionalLinkTags={[
				{
					rel: 'icon',
					href: '/favicon.ico',
					type: 'image/png',
				},
			]}
		/>
	);
}
