import Head from 'next/head'
import React, { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import { envConfig } from 'app.env.config'

type LayoutProps = {
	children: NonNullable<ReactNode>
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
	return (
		<>
			<Head>
				<title>{envConfig.AppName} - Home</title>
			</Head>
			<Navbar />
			<div className="h-main overflow-scroll no-scrollbar pt-24">
				<main className="block mx-auto max-w-6xl space-y-8 px-4 md:px-8 2xl:max-w-7xl min-h-content">{children}</main>
				<Footer />
			</div>
		</>
	)
}

export default Layout
