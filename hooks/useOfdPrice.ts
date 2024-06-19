import { ABIS } from "@contracts";
import { useContractRead } from "wagmi";

export const useOfdPrice = () => {
	const { data } = useContractRead({
		abi: ABIS.UniswapV3PoolABI,
		address: "0x8E4318E2cb1ae291254B187001a59a1f8ac78cEF",
		functionName: "slot0",
	});

	const sqrtPriceX96 = data ? Number(data[0]) : 0;

	const ofdPrice = ((sqrtPriceX96 * sqrtPriceX96) / 2 ** 192) * 10 ** 12;

	return parseFloat(ofdPrice.toFixed(4));
};
