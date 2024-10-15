import { Tooltip } from 'flowbite-react'
import Link from 'next/link'

interface Props {
	title: string
	className?: string
	link?: string
	backTo?: string
	backText?: string
	tooltip?: string
}

export default function AppPageHeader({ title, className, link, backTo, backText, tooltip }: Props) {
	const content = () => {
		return link ? (
			<Link
				className="text-pink-400 no-underline transition-all duration-300 ease-in-out hover:text-cyan-400 hover:shadow-md"
				href={link}
				target="_blank"
			>
				{title}
			</Link>
		) : (
			title
		)
	}

	return (
		<section className={`my-5 flex grid-cols-8 flex-col gap-2 py-4 sm:flex-row lg:grid ${className}`}>
			<div>
				{backTo && (
					<Link
						className="text-teal-400 no-underline transition-all duration-300 ease-in-out hover:text-pink-400 hover:shadow-md"
						href={backTo}
					>
						{backText}
					</Link>
				)}
			</div>
			<h1 className="font-xl col-span-6 flex-1 text-center mx-auto text-xl font-bold">
				{!tooltip ? (
					content()
				) : (
					<Tooltip arrow content={tooltip} style="light">
						{content()}
					</Tooltip>
				)}
			</h1>
		</section>
	)
}
