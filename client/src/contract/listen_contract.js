import { ethers } from 'ethers';
import stake_ERC_20_Contract_ABI from '../abi/ERC_20_Contract.json';
import stake_BulkSender_Contract_ABI from '../abi/BulkSender_Contract.json';

const erc20 = import.meta.env.VITE_ERC20_TokenAddress;
const BulkSender = import.meta.env.VITE_BULKSENDER_TokenAddress;

export const ERC_20Contract = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(erc20, stake_ERC_20_Contract_ABI, signer);

    // const contract = new ethers.Contract(tokenAddress, stakeContractABI, provider);
    // const contract = new ethers.Contract(tokenAddress, stakeContractABI, provider.getSigner());
    // console.log(contract);
    
    return contract;
};

export const BulkSenderContract = async() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(BulkSender, stake_BulkSender_Contract_ABI, signer);

    return contract;
};