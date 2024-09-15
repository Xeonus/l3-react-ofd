import AppBox from "@components/AppBox";
import AppPageHeader from "@components/AppPageHeader";
import Button from "@components/Button";
import DisplayAmount from "@components/DisplayAmount";
import DisplayLabel from "@components/DisplayLabel";
import GuardToAllowedChainBtn from "@components/Guards/GuardToAllowedChainBtn";
import TokenInput from "@components/Input/TokenInput";
import { TxToast, renderErrorToast } from "@components/TxToast";
import { ABIS, ADDRESS } from "@contracts";
import { useChallengeListStats, useChallengeLists, useContractUrl, usePositionStats } from "@hooks";
import { erc20Abi, formatUnits, getAddress, zeroAddress } from "viem";
import { abs, formatBigInt, formatDate, formatDuration, min, shortenAddress } from "@utils";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";
import { WagmiConfig, useChainId } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { envConfig } from "../../../../app.env.config";
import { WAGMI_CONFIG } from "../../../../app.config";
import { WAGMI_CONFIG } from "../../../../app.config";

export default function ChallengePlaceBid({}) {
	const [amount, setAmount] = useState(0n);
	const [error, setError] = useState("");
	const [isApproving, setApproving] = useState(false);
	const [isBidding, setBidding] = useState(false);

	const router = useRouter();
	const { address, index } = router.query;
	const position = getAddress(String(address || zeroAddress));
	const challengeIndex = parseInt(String(index) || "0");

	const chainId = useChainId();

	const { challenges } = useChallengeLists({ position });
	const { challengsData } = useChallengeListStats(challenges);
	const positionStats = usePositionStats(position);
	const matchingChallenges = challengsData.filter((challenge) => Number(challenge.index) == challengeIndex);
	const challenge = matchingChallenges.length > 0 ? matchingChallenges[0] : undefined;
	const challengerUrl = useContractUrl(challenge?.challenger || zeroAddress);

	const remainingCol = (challenge?.size || 0n) - (challenge?.filledSize || 0n);
	const buyNowPrice = challenge?.price || 0n;
	const expectedOFD = (bidAmount?: bigint) => {
		if (!bidAmount) bidAmount = amount;
		return challenge ? (bidAmount * challenge.price) / BigInt(1e18) : BigInt(0);
	};

	const onChangeAmount = (value: string) => {
		const valueBigInt = BigInt(value);
		setAmount(valueBigInt);

		if (valueBigInt > positionStats.collateralUserBal) {
			setError("Not enough balance in your wallet.");
		} else if (valueBigInt > remainingCol) {
			setError("Expected winning collateral should be lower than remaining collateral.");
		} else {
			setError("");
		}
	};

	const handleApprove = async () => {
		try {
			setApproving(true);

			const approveWriteHash = await writeContract(WAGMI_CONFIG, {
				address: ADDRESS[chainId].usdt,
				abi: erc20Abi,
				functionName: "approve",
				args: [ADDRESS[chainId].mintingHub, expectedOFD()],
			});

			const toastContent = [
				{
					title: "Amount:",
					value: formatBigInt(expectedOFD()) + " OFD",
				},
				{
					title: "Spender: ",
					value: shortenAddress(ADDRESS[chainId].mintingHub),
				},
				{
					title: "Transaction:",
					hash: approveWriteHash,
				},
			];

			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash: approveWriteHash, confirmations: 1 }), {
				pending: {
					render: <TxToast title={`Approving OFD`} rows={toastContent} />,
				},
				success: {
					render: <TxToast title="Successfully Approved OFD" rows={toastContent} />,
				},
				error: {
					render(error: any) {
						return renderErrorToast(error);
					},
				},
			});
		} finally {
			setApproving(false);
		}
	};

	const handleBid = async () => {
		const bidWriteHash = await writeContract(WAGMI_CONFIG, {
			address: ADDRESS[chainId].mintingHub,
			abi: ABIS.MintingHubABI,
			functionName: "bid",
			args: [Number(challenge?.index || 0n), amount, true],
		});

		const toastContent = [
			{
				title: `Bid Amount: `,
				value: formatBigInt(amount, positionStats.collateralDecimal) + " " + positionStats.collateralSymbol,
			},
			{
				title: `Expected OFD: `,
				value: formatBigInt(expectedOFD()) + " OFD",
			},
			{
				title: "Transaction:",
				hash: bidWriteHash,
			},
		];

		await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG,{ hash: bidWriteHash, confirmations: 1 }), {
			pending: {
				render: <TxToast title={`Placing a bid`} rows={toastContent} />,
			},
			success: {
				render: <TxToast title="Successfully Placed Bid" rows={toastContent} />,
			},
			error: {
				render(error: any) {
					return renderErrorToast(error);
				},
			},
		});
	};

	return (
		<>
			<Head>
				<title>{envConfig.AppName} - Place Bid</title>
			</Head>
			<div>
				<AppPageHeader title="Place your bid" backText="Back to position" backTo={`/position/${address}`} />
				<section className="mx-auto max-w-2xl sm:px-8">
					<div className="bg-slate-950 rounded-xl p-4 flex flex-col gap-y-4">
						<div className="text-lg font-bold text-center mt-3">Bid Details</div>
						<div className="space-y-12">
							<div className="space-y-4">
								<TokenInput
									label="You are buying"
									max={min(positionStats.collateralUserBal, remainingCol)}
									value={amount.toString()}
									onChange={onChangeAmount}
									digit={positionStats.collateralDecimal}
									symbol={positionStats.collateralSymbol}
									error={error}
									placeholder="Collateral Amount"
								/>
								<div className="flex flex-col gap-1">
									<span>Expected total price: {formatUnits(expectedOFD(), 18)} OFD</span>
								</div>
							</div>
						</div>
						<div className="bg-slate-900 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-2 lg:col-span-2">
							<AppBox>
								<DisplayLabel label="Remaining Collateral" />
								<DisplayAmount
									amount={remainingCol}
									currency={positionStats.collateralSymbol}
									address={positionStats.collateral}
								/>
							</AppBox>
							<AppBox>
								<DisplayLabel label="Original Size" />
								<DisplayAmount
									amount={challenge?.size || 0n}
									currency={positionStats.collateralSymbol}
									address={positionStats.collateral}
								/>
							</AppBox>
							<AppBox>
								<DisplayLabel label="Price per Unit" />
								<DisplayAmount
									amount={buyNowPrice}
									digits={36 - positionStats.collateralDecimal}
									address={ADDRESS[chainId].oracleFreeDollar}
									currency={"OFD"}
								/>
							</AppBox>
							<AppBox>
								<DisplayLabel label="Reaching Zero at" />
								{formatDate(challenge?.auctionEnd || 0)}
							</AppBox>
							<AppBox>
								<DisplayLabel label="Phase Duration" />
								<div>{formatDuration(positionStats.challengePeriod)}</div>
							</AppBox>
							<AppBox>
								<DisplayLabel label="Challenger" />
								<Link className="text-link" href={challengerUrl} target="_blank" rel="noreferrer">
									{shortenAddress(challenge?.challenger || zeroAddress)}
								</Link>
							</AppBox>
						</div>
						<div className="mx-auto mt-4 w-72 max-w-full flex-col">
							<GuardToAllowedChainBtn>
								{expectedOFD() > positionStats.ofdAllowance ? (
									<Button isLoading={isApproving} onClick={() => handleApprove()}>
										Approve
									</Button>
								) : (
									<Button
										variant="primary"
										disabled={amount == 0n}
										isLoading={isBidding}
										onClick={() => handleBid()}
									>
										Place Bid
									</Button>
								)}
							</GuardToAllowedChainBtn>
						</div>
					</div>
				</section>
			</div>
		</>
	);
}
