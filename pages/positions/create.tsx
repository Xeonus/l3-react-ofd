"use client";

import AppPageHeader from "@components/AppPageHeader";
import Button from "@components/Button";
import GuardToAllowedChainBtn from "@components/Guards/GuardToAllowedChainBtn";
import AddressInput from "@components/Input/AddressInput";
import NormalInput from "@components/Input/NormalInput";
import TokenInput from "@components/Input/TokenInput";
import { TxToast, renderErrorToast } from "@components/TxToast";
import { ABIS, ADDRESS } from "@contracts";
import { useTokenData, useUserBalance } from "@hooks";
import { formatBigInt, shortenAddress } from "@utils";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { erc20Abi, isAddress, maxUint256 } from "viem";
import { useChainId } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { envConfig } from "../../app.env.config";
import { WAGMI_CONFIG } from "../../app.config";

export default function PositionCreate({}) {
	const [minCollAmount, setMinCollAmount] = useState(0n);
	const [initialCollAmount, setInitialCollAmount] = useState(0n);
	const [limitAmount, setLimitAmount] = useState(1_000_000n * BigInt(1e18));
	const [initPeriod, setInitPeriod] = useState(5n);
	const [liqPrice, setLiqPrice] = useState(0n);
	const [interest, setInterest] = useState(30000n);
	const [maturity, setMaturity] = useState(12n);
	const [buffer, setBuffer] = useState(200000n);
	const [auctionDuration, setAuctionDuration] = useState(24n);
	const [collateralAddress, setCollateralAddress] = useState("");
	const [minCollAmountError, setMinCollAmountError] = useState("");
	const [initialCollAmountError, setInitialCollAmountError] = useState("");
	const [collTokenAddrError, setCollTokenAddrError] = useState("");
	const [limitAmountError, setLimitAmountError] = useState("");
	const [interestError, setInterestError] = useState("");
	const [initError, setInitError] = useState("");
	const [liqPriceError, setLiqPriceError] = useState("");
	const [bufferError, setBufferError] = useState("");
	const [auctionError, setAuctionError] = useState("");
	const [isConfirming, setIsConfirming] = useState("");

	const chainId = useChainId();
	const collTokenData = useTokenData(collateralAddress);
	const userBalance = useUserBalance();

	useEffect(() => {
		if (isAddress(collateralAddress)) {
			if (collTokenData.name == "NaN") {
				setCollTokenAddrError("Could not obtain token data");
			} else if (collTokenData.decimals > 24n) {
				setCollTokenAddrError("Token decimals should be less than 24.");
			} else {
				setCollTokenAddrError("");
			}
		} else {
			setLiqPriceError("");
			setLimitAmountError("");
			setMinCollAmountError("");
			setInitialCollAmountError("");
			setCollTokenAddrError("");
		}
	}, [collateralAddress, collTokenData]);

	const onChangeMinCollAmount = (value: string) => {
		const valueBigInt = BigInt(value);
		setMinCollAmount(valueBigInt);
		if (valueBigInt > initialCollAmount) {
			setInitialCollAmount(valueBigInt);
			onChangeInitialCollAmount(valueBigInt.toString());
		}
		checkCollateralAmount(valueBigInt, liqPrice);
	};

	const onChangeInitialCollAmount = (value: string) => {
		const valueBigInt = BigInt(value);
		setInitialCollAmount(valueBigInt);
		if (valueBigInt < minCollAmount) {
			setInitialCollAmountError("Must be at least the minimum amount.");
		} else if (valueBigInt > collTokenData.balance) {
			setInitialCollAmountError(`Not enough ${collTokenData.symbol} in your wallet.`);
		} else {
			setInitialCollAmountError("");
		}
	};

	const onChangeLimitAmount = (value: string) => {
		const valueBigInt = BigInt(value);
		setLimitAmount(valueBigInt);
	};

	const onChangeCollateralAddress = (addr: string) => {
		setCollateralAddress(addr);
		setMinCollAmount(0n);
		setInitialCollAmount(0n);
		setLiqPrice(0n);
	};

	const onChangeInterest = (value: string) => {
		const valueBigInt = BigInt(value);
		setInterest(valueBigInt);

		if (valueBigInt > 100_0000n) {
			setInterestError("Annual Interest Rate should be less than 100%");
		} else {
			setInterestError("");
		}
	};

	const onChangeMaturity = (value: string) => {
		const valueBigInt = BigInt(value);
		setMaturity(valueBigInt);
	};

	const onChangeInitPeriod = (value: string) => {
		const valueBigInt = BigInt(value);
		setInitPeriod(valueBigInt);
		if (valueBigInt < 3n) {
			setInitError("Initialization Period must be at least 3 days.");
		} else {
			setInitError("");
		}
	};

	const onChangeLiqPrice = (value: string) => {
		const valueBigInt = BigInt(value);
		setLiqPrice(valueBigInt);
		checkCollateralAmount(minCollAmount, valueBigInt);
	};

	function checkCollateralAmount(coll: bigint, price: bigint) {
		if (coll * price < 5000n * 10n ** 36n) {
			setLiqPriceError("The liquidation value of the collateral must be at least 5000 OFD");
			setMinCollAmountError("The collateral must be worth at least 5000 OFD");
		} else {
			setLiqPriceError("");
			setMinCollAmountError("");
		}
	}

	const onChangeBuffer = (value: string) => {
		const valueBigInt = BigInt(value);
		setBuffer(valueBigInt);
		if (valueBigInt > 1000_000n) {
			setBufferError("Buffer cannot exceed 100%");
		} else if (valueBigInt < 100_000) {
			setBufferError("Buffer must be at least 10%");
		} else {
			setBufferError("");
		}
	};

	const onChangeAuctionDuration = (value: string) => {
		const valueBigInt = BigInt(value);
		setAuctionDuration(valueBigInt);
	};

	const hasFormError = () => {
		return (
			!!minCollAmountError ||
			!!initialCollAmountError ||
			!!collTokenAddrError ||
			!!limitAmountError ||
			!!interestError ||
			!!liqPriceError ||
			!!bufferError ||
			!!auctionError ||
			!!initError
		);
	};

	const handleApprove = async () => {
		try {
			setIsConfirming("approve");
			const approveWriteHash = await writeContract(WAGMI_CONFIG, {
				address: collTokenData.address,
				abi: erc20Abi,
				functionName: "approve",
				args: [ADDRESS[chainId].mintingHub, maxUint256],
			});

			const toastContent = [
				{
					title: "Amount:",
					value: "infinite " + collTokenData.symbol,
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
					render: <TxToast title={`Approving ${collTokenData.symbol}`} rows={toastContent} />,
				},
				success: {
					render: <TxToast title={`Successfully Approved ${collTokenData.symbol}`} rows={toastContent} />,
				},
				error: {
					render(error: any) {
						return renderErrorToast(error);
					},
				},
			});
		} catch (e) {
			console.log(e);
		} finally {
			setIsConfirming("");
		}
	};

	const handleOpenPosition = async () => {
		try {
			setIsConfirming("open");
			const openWriteHash = await writeContract(WAGMI_CONFIG, {
				address: ADDRESS[chainId].mintingHub,
				abi: ABIS.MintingHubABI,
				functionName: "openPosition",
				args: [
					collTokenData.address,
					minCollAmount,
					initialCollAmount,
					limitAmount,
					initPeriod * 86400n,
					maturity * 86400n * 30n,
					auctionDuration * 3600n,
					Number(interest),
					liqPrice,
					Number(buffer),
				],
			});

			const toastContent = [
				{
					title: "Collateral",
					value: shortenAddress(collTokenData.address),
				},
				{
					title: "Collateral Amount:",
					value: formatBigInt(initialCollAmount) + collTokenData.symbol,
				},
				{
					title: "LiqPrice: ",
					value: formatBigInt(liqPrice),
				},
				{
					title: "Transaction:",
					hash: openWriteHash,
				},
			];

			await toast.promise(waitForTransactionReceipt(WAGMI_CONFIG, { hash: openWriteHash, confirmations: 1 }), {
				pending: {
					render: <TxToast title={`Creating a new position`} rows={toastContent} />,
				},
				success: {
					render: <TxToast title={`Successfully created a position`} rows={toastContent} />,
				},
				error: {
					render(error: any) {
						return renderErrorToast(error);
					},
				},
			});
		} catch (e) {
			console.log(e);
		} finally {
			collTokenData.refetch();
			userBalance.refetch();
			setIsConfirming("");
		}
	};

	return (
		<>
			<Head>
				<title>{envConfig.AppName} - Propose Position</title>
			</Head>
			<div>
				<AppPageHeader
					title="Propose New Position Type"
					backText="Back to positions"
					backTo={`/positions`}
					tooltip="Propose a completely new position with a collateral of your choice."
				/>
				<section className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="bg-slate-950 rounded-xl p-4 flex flex-col gap-y-4">
						<div className="text-lg font-bold justify-center mt-3 flex">Initialization</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							<TokenInput
								label="Proposal Fee"
								symbol="OFD"
								hideMaxLabel
								value={BigInt(1000 * 1e18).toString()}
								onChange={onChangeInitialCollAmount}
								digit={18}
								error={userBalance.ofdBalance < BigInt(1000 * 1e18) ? "Not enough OFD" : ""}
								disabled
							/>
							<NormalInput
								label="Initialization Period"
								symbol="days"
								error={initError}
								digit={0}
								hideMaxLabel
								value={initPeriod.toString()}
								onChange={onChangeInitPeriod}
								placeholder="Initialization Period"
							/>
						</div>
						<div>
							It is recommended to{" "}
							<Link href="https://github.com/oracleFreeDollar-OFD/oracleFreeDollar/discussions" target="_blank">
								{" "}
								discuss{" "}
							</Link>{" "}
							new positions before initiating them to increase the probability of passing the decentralized governance
							process.
						</div>
					</div>
					<div className="bg-slate-950 rounded-xl p-4 flex flex-col gap-y-4">
						<div className="text-lg font-bold justify-center mt-3 flex">Collateral</div>

						<AddressInput
							label="Collateral Token"
							error={collTokenAddrError}
							placeholder="Token contract address"
							value={collateralAddress}
							onChange={onChangeCollateralAddress}
						/>
						{collTokenData.symbol != "NaN" &&
						(collTokenData.allowance == 0n ||
							collTokenData.allowance < minCollAmount ||
							collTokenData.allowance < initialCollAmount) ? (
							<Button
								isLoading={isConfirming == "approve"}
								disabled={
									collTokenData.symbol == "NaN" ||
									(collTokenData.allowance > minCollAmount && collTokenData.allowance > initialCollAmount)
								}
								onClick={() => handleApprove()}
							>
								Approve {collTokenData.symbol == "NaN" ? "" : "Handling of " + collTokenData.symbol}
							</Button>
						) : (
							""
						)}
						<TokenInput
							label="Minimum Collateral"
							symbol={collTokenData.symbol}
							error={minCollAmountError}
							hideMaxLabel
							value={minCollAmount.toString()}
							onChange={onChangeMinCollAmount}
							digit={collTokenData.decimals}
							placeholder="Minimum Collateral Amount"
						/>
						<TokenInput
							label="Initial Collateral"
							symbol={collTokenData.symbol}
							error={initialCollAmountError}
							max={collTokenData.balance}
							value={initialCollAmount.toString()}
							onChange={onChangeInitialCollAmount}
							digit={collTokenData.decimals}
							placeholder="Initial Collateral Amount"
						/>
					</div>
					<div className="bg-slate-950 rounded-xl p-4 flex flex-col gap-y-4">
						<div className="text-lg font-bold text-center mt-3">Financial Terms</div>
						<TokenInput
							label="Minting Limit"
							hideMaxLabel
							symbol="OFD"
							error={limitAmountError}
							value={limitAmount.toString()}
							onChange={onChangeLimitAmount}
							placeholder="Limit Amount"
						/>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							<NormalInput
								label="Annual Interest"
								symbol="%"
								error={interestError}
								digit={4}
								hideMaxLabel
								value={interest.toString()}
								onChange={onChangeInterest}
								placeholder="Annual Interest Percent"
							/>
							<NormalInput
								label="Maturity"
								symbol="months"
								hideMaxLabel
								digit={0}
								value={maturity.toString()}
								onChange={onChangeMaturity}
								placeholder="Maturity"
							/>
						</div>
					</div>
					<div className="bg-slate-950 rounded-xl p-4 flex flex-col gap-y-4">
						<div className="text-lg font-bold text-center mt-3">Liquidation</div>
						<TokenInput
							label="Liquidation Price"
							balanceLabel="Pick"
							symbol="OFD"
							error={liqPriceError}
							digit={36n - collTokenData.decimals}
							hideMaxLabel={minCollAmount == 0n}
							max={minCollAmount == 0n ? 0n : (5000n * 10n ** 36n + minCollAmount - 1n) / minCollAmount}
							value={liqPrice.toString()}
							onChange={onChangeLiqPrice}
							placeholder="Price"
						/>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							<NormalInput
								label="Retained Reserve"
								symbol="%"
								error={bufferError}
								digit={4}
								hideMaxLabel
								value={buffer.toString()}
								onChange={onChangeBuffer}
								placeholder="Percent"
							/>
							<NormalInput
								label="Auction Duration"
								symbol="hours"
								error={auctionError}
								hideMaxLabel
								digit={0}
								value={auctionDuration.toString()}
								onChange={onChangeAuctionDuration}
								placeholder="Auction Duration"
							/>
						</div>
					</div>
				</section>
				<div className="mx-auto mt-8 w-72 max-w-full flex-col">
					<GuardToAllowedChainBtn>
						<Button
							variant="primary"
							disabled={
								minCollAmount == 0n ||
								collTokenData.allowance < initialCollAmount ||
								initialCollAmount == 0n ||
								hasFormError()
							}
							isLoading={isConfirming == "open"}
							onClick={() => handleOpenPosition()}
						>
							Propose Position
						</Button>
					</GuardToAllowedChainBtn>
				</div>
			</div>
		</>
	);
}
