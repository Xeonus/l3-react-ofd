import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<meta content="#240019" name="theme-color" />
				<link href="/favicon.ico" rel="icon" type="image/png" />
			</Head>
			<body className="font-sans px-0 md:px-8 max-w-screen-2xl container-xl mx-auto text-slate-400 bg-gradient">
			<Main />
				<NextScript />
			</body>
		</Html>
	)
}
