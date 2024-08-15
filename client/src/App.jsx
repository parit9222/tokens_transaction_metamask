import React, { useState, useEffect, useRef } from 'react';
import Web3 from 'web3';
import * as XLSX from 'xlsx';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BulkSenderContract, ERC_20Contract } from './contract/listen_contract.js';
import { ethers } from 'ethers';
import Navbar from './components/Navbar.jsx';


const web3 = new Web3(Web3.givenProvider);
// [1000000000000000000, 1000000000000000000]
// [1000000000000000000n, 1000000000000000000n]

export default function App() {

  const ERC_20_TokenAddress = import.meta.env.VITE_ERC20_TokenAddress;
  const BulkSender_TokenAddress = import.meta.env.VITE_BULKSENDER_TokenAddress;
  const fileRef = useRef(null);
  const addressSize = 5;

  const [walletAddress, setWalletAddress] = useState('');
  const [walletAddressForBalance, setWalletAddressForBalance] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [file, setFile] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [rowAmount, setRowAmount] = useState(0);
  const [showDisconnectPopup, setShowDisconnectPopup] = useState(false);
  const [groupedTransferData, setGroupedTransferData] = useState([]);
  const [groupedToken, setGroupedToken] = useState([]);
  const [groupedAmount, setGroupedAmount] = useState([]);
  const [isUploading, setIsUploading] = useState(false);






  const handleAllowance = async () => {
    const contractResult = await ERC_20Contract();

    if (walletAddressForBalance) {
      const allowance = await contractResult.allowance(walletAddressForBalance, BulkSender_TokenAddress);
      // await allowance.wait();
      console.log(Number(allowance));
      return Number(allowance);
    } else {
      toast.error('error in handleAllowance');
    }

  }

  const handleApprove = async () => {
    const contractResult = await ERC_20Contract();
    console.log(contractResult);

    if (walletAddressForBalance) {
      const decimals = await contractResult.decimals();
      const amountToSend = (BigInt(Math.floor(Number(rowAmount) * Math.pow(10, decimals))));
      const approve = await contractResult.approve(BulkSender_TokenAddress, amountToSend);
      await approve.wait();
      console.log(approve);

      return approve;
    } else {
      toast.error('error in handleApprove');
    }

  };

  const handleTokenSender = async () => {
    const contractResult = await BulkSenderContract();

    if (walletAddressForBalance && groupedToken && groupedAmount) {
      if (groupedToken.length === groupedAmount.length) {
        for (let i = 0; i < groupedToken.length; i++) {
          console.log(groupedToken[i], groupedAmount[i]);
          const tokenSender = await contractResult.tokenSender(ERC_20_TokenAddress, groupedToken[i], groupedAmount[i]);
          await tokenSender.wait();

        }
      }
    } else {
      toast.error('Error in handleApprove: Missing wallet address or grouped transfer data');
    }
  };



  const handleDecimalsForArray = async (deci) => {
    const contractResult = await ERC_20Contract();

    if (walletAddressForBalance) {
      const decimals = await contractResult.decimals();
      const amountToSend = (BigInt(Math.floor(Number(deci) * Math.pow(10, decimals))));
      console.log(amountToSend);

      return amountToSend;
    } else {
      toast.error('array');
      return null;
    }
  };



  const handleTransferTokenFromExcel = async () => {
    const contractResult = await ERC_20Contract();
    if (walletAddressForBalance && groupedTransferData.length) {
      try {
        const decimals = await contractResult.decimals();

        for (let group of groupedTransferData) {
          const batchTransfers = group.map(({ token, amount }) => {
            const amountToSend = (BigInt(Math.floor(Number(amount) * Math.pow(10, decimals)))).toString();
            return contractResult.transfer(token, amountToSend);
          });

          const batchTransferResult = await Promise.all(batchTransfers);
          console.log(`Batch transfer result:`, batchTransferResult);
        }

        toast.success('All tokens transferred successfully');
        setTimeout(() => {
          window.location.reload();
        }, 10000);
      } catch (error) {
        console.error('Error transferring tokens', error);
        toast.error('Error transferring tokens');
      }
    } else {
      toast.error('Please provide valid wallet addresses and amounts');
    }
  };


  const getBalance = async () => {
    const contractResult = await ERC_20Contract();
    if (walletAddressForBalance && contractResult) {
      const balanceOf = await contractResult.balanceOf(walletAddressForBalance);
      const decimals = await contractResult.decimals();
      setWalletBalance(Number(balanceOf) / Math.pow(10, decimals));
    }
  };

  useEffect(() => {
    if (walletAddressForBalance) {
      getBalance();
    }
  }, [walletAddressForBalance]);


  const handleFormatWalletAddress = (address, charCount) => {

    if (charCount === 0) {
      return address;
    } else {
      const count = Math.max(1, charCount);
      const start = address.slice(0, count);
      const end = address.slice(-count);

      return `${start}...${end}`;
    }
  }

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {

            setWalletAddress(handleFormatWalletAddress(accounts[0], addressSize));
            setWalletAddressForBalance(accounts[0]);

            setIsConnected(true);
          }
        } catch (error) {
          console.error("Error checking wallet connection", error);
        }
      }
    };
    checkWalletConnection();
  }, []);

  const switchToBSC = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x61' }]
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x61',
                chainName: 'Binance Smart Chain Testnet',
                rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
                nativeCurrency: {
                  name: 'Binance Coin',
                  symbol: 'BNB',
                  decimals: 18
                },
                blockExplorerUrls: ['https://testnet.bscscan.com/']
              }
            ]
          });
          return true;
        } catch (addError) {
          console.error("Error adding BSC Testnet network", addError);
          return false;
        }
      } else {
        console.error("Error switching to BSC Testnet network", error);
        return false;
      }
    }
  };

  const handleConnectMetamask = async () => {
    if (window.ethereum) {
      try {
        const network = await web3.eth.net.getId();
        let switched = true;
        if (network !== 97) {
          switched = await switchToBSC();
        }

        if (switched) {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          const address = accounts[0];

          setWalletAddress(handleFormatWalletAddress(address, addressSize));
          setWalletAddressForBalance(address);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error connecting to Metamask", error);
      }
    } else {
      alert('Please install Metamask!');
    }
  };

  const handleDisconnectMetamask = () => {
    setShowDisconnectPopup(true);
  };

  const handleConfirmDisconnect = async () => {
    try {
      await window.ethereum.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
      setWalletAddress('');
      setWalletBalance('');
      setIsConnected(false);
      setShowDisconnectPopup(false);
      toast.success('Wallet disconnected successfully');
    } catch (error) {
      console.error("Error disconnecting from Metamask", error);
      toast.error('Error disconnecting from Metamask');
      setShowDisconnectPopup(false);
    }
  };

  const handleCancelDisconnect = () => {
    setShowDisconnectPopup(false);
    toast.info('Disconnect wallet canceled');
  };



  const handleUpload = async () => {
    const groupSize = 2;
    const fixedDigitValue = 6;

    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const tokens = jsonData.map(row => row.tokens);
        const amounts = jsonData.map(row => row.amount);

        const hasEmptyValues = tokens.some(token => !token) || amounts.some(amount => !amount);

        if (hasEmptyValues) {
          toast.error("The Excel sheet contains empty values. Please fill all values before uploading.");
          return;
        }

        if (tokens.length === amounts.length) {
          const groupedTokens = [];
          const groupedAmounts = [];
          const tokenSet = new Set();
          let hasDuplicates = false;
          let hasInvalidAddresses = false;

          for (let i = 0; i < tokens.length; i += groupSize) {
            const tokenGroup = [];
            const amountGroup = [];

            for (let j = i; j < i + groupSize && j < tokens.length; j++) {
              const tokenAddress = tokens[j];
              if (!ethers.utils.isAddress(tokenAddress)) {
                hasInvalidAddresses = true;
              }

              const amount = await handleDecimalsForArray(amounts[j]);
              tokenGroup.push(tokenAddress);
              amountGroup.push(amount);

              if (tokenSet.has(tokenAddress)) {
                hasDuplicates = true;
              } else {
                tokenSet.add(tokenAddress);
              }
            }

            groupedTokens.push(tokenGroup);
            groupedAmounts.push(amountGroup);
          }
          setGroupedToken(groupedTokens);
          setGroupedAmount(groupedAmounts);
          setGroupedTransferData({ token: groupedTokens, amount: groupedAmounts });
          setRowCount(tokens.length);
          const totalAmount = amounts.reduce((sum, value) => sum + value, 0);
          setRowAmount(totalAmount.toFixed(fixedDigitValue));

          if (hasInvalidAddresses) {
            toast.error("The Excel sheet contains invalid addresses. Please correct them before uploading.");
          } else if (hasDuplicates) {
            setShowDuplicatePopup(true);
          } else {
            setShowPopup(true);
          }
        } else {
          toast.error("Number of rows in 'tokens' and 'amount' columns do not match.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };


  // const handleConfirmUpload = async () => {
  //   if (rowAmount >= walletBalance) {
  //     toast.error('Insufficient Balance are there in your Wallet');
  //     setShowPopup(false);
  //     return;
  //   }
  //   // const log = await handleAllowance();
  //   // console.log(log);

  //   // const log1 = await handleApprove();
  //   // console.log(log1);

  //   const log2 = await handleTokenSender();
  //   console.log(log2);

  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     const data = new Uint8Array(e.target.result);
  //     const workbook = XLSX.read(data, { type: 'array' });
  //     const sheetName = workbook.SheetNames[0];
  //     const worksheet = workbook.Sheets[sheetName];
  //     const jsonData = XLSX.utils.sheet_to_json(worksheet);

  //     fetch('/api/token', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(jsonData),
  //     })
  //       .then((response) => {
  //         if (!response.ok) {
  //           throw new Error('Network response was not ok');
  //         }
  //         return response.json();
  //       })
  //       .then((data) => {
  //         console.log('Data successfully uploaded:', data);
  //         toast.success('Data uploaded successfully');
  //       })
  //       .catch((error) => {
  //         console.error('Error uploading data:', error);
  //         toast.error('Error uploading data');
  //       });
  //   };

  //   reader.readAsArrayBuffer(file);

  //   console.log(groupedTransferData);

  //   setShowPopup(false);
  // };

  // const handleConfirmUpload = async () => {
  //   if (rowAmount >= walletBalance) {
  //     toast.error('Insufficient Balance are there in your Wallet');
  //     setShowPopup(false);
  //     return;
  //   }

  //   try {
  //     const approval = await handleApprove();

  //     if (approval.toString() === '0') {
  //       const allowance = await handleAllowance();
  //       if (allowance.toString() === '0') { 
  //         toast.error('Approval failed. Cannot proceed with the token transfer.');
  //         setShowPopup(false);
  //         return;
  //       } else {
  //         toast.success('Approval granted.');
  //       }
  //     }

  //     await handleTokenSender();

  //     const reader = new FileReader();
  //     reader.onload = (e) => {
  //       const data = new Uint8Array(e.target.result);
  //       const workbook = XLSX.read(data, { type: 'array' });
  //       const sheetName = workbook.SheetNames[0];
  //       const worksheet = workbook.Sheets[sheetName];
  //       const jsonData = XLSX.utils.sheet_to_json(worksheet);

  //       fetch('/api/token', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify(jsonData),
  //       })
  //         .then((response) => {
  //           if (!response.ok) {
  //             throw new Error('Network response was not ok');
  //           }
  //           return response.json();
  //         })
  //         .then((data) => {
  //           console.log('Data successfully uploaded:', data);
  //           toast.success('Data uploaded successfully');
  //         })
  //         .catch((error) => {
  //           console.error('Error uploading data:', error);
  //           toast.error('Error uploading data');
  //         });
  //     };

  //     reader.readAsArrayBuffer(file);
  //   } catch (error) {
  //     console.error('Error during token approval or transfer:', error);
  //     toast.error('Error during token approval or transfer');
  //   }

  //   setShowPopup(false);
  // };

  const handleConfirmUpload = async () => {
    if (rowAmount >= walletBalance) {
      toast.error('Insufficient Balance are there in your Wallet');
      setShowPopup(false);
      return;
    }
    setIsUploading(true);
    try {
      const allowance = await handleAllowance();
      console.log(allowance);
      console.log(rowAmount * (10 ** 18));
      console.log(rowAmount * (10 ** 18) > allowance);

      const rowAmountBigInt = rowAmount * (10 ** 18);
      console.log(rowAmountBigInt);

      console.log(rowAmountBigInt > allowance);


      if (rowAmountBigInt > allowance) {

        const approval = await handleApprove();
        console.log(approval);

      }

      await handleTokenSender();


      toast.success("Tokens transfer successfully");


    } catch (error) {
      console.error('Error during token approval or transfer:', error);
      toast.error('Error during token approval or transfer');
    } finally {
      setIsUploading(false);
    }

    setShowPopup(false);
  };


  const handleCancelUpload = () => {
    toast.error('File submission canceled');
    setShowPopup(false);
  };

  const handleAllowDuplicates = () => {
    setShowDuplicatePopup(false);
    setShowPopup(true);
  };

  const handleDisallowDuplicates = () => {
    toast.error('File submission canceled due to duplicates');
    setShowDuplicatePopup(false);
  };


  return (
    <div className="min-h-screen bg-gray-100">

      <Navbar
        isConnected={isConnected}
        walletAddress={walletAddress}
        walletBalance={Number(walletBalance).toFixed(2)}
        handleConnectMetamask={handleConnectMetamask}
        handleDisconnectMetamask={handleDisconnectMetamask}
      />

      <div className="container max-w-lg mx-auto py-8">
        {isConnected && (
          <div className="bg-white p-8 rounded shadow-md text-center">
            {/* <p className='text-xl font-semibold mb-6'>{walletBalance ? `Balance :- ${walletBalance} USDT` : `Your Wallet is not connected`}</p> */}
            <h1 className="text-2xl font-semibold mb-6">Excel File Upload</h1>
            <div className='border pt-3 rounded-lg'>
              <input
                type="file"
                accept=".xlsx, .xls"
                ref={fileRef}
                onChange={(e) => setFile(e.target.files[0])}
                className="mb-4"
              />
              <button
                onClick={handleUpload}
                className={file ?
                  "bg-blue-500 text-white py-2 px-4 rounded-full hover:bg-blue-600"
                  :
                  "disabled bg-blue-400 text-white py-2 px-4 rounded-full"}
              >
                Upload
              </button>
            </div>
          </div>
        )}

        <ToastContainer />

        {showPopup && (
          <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-60'>
            <div className='bg-white p-6 rounded-lg shadow-lg max-w-lg w-full'>
              <h2 className='text-2xl font-semibold text-gray-800 mb-4'>Upload Confirmation</h2>
              <p className='text-gray-700 mb-2'><span className='font-medium'>Number of Tokens :</span> {rowCount}</p>
              <p className='text-gray-700 mb-4'><span className='font-medium'>Total Sum of Amount :</span> {rowAmount}</p>
              <div className='flex justify-end gap-3'>
                <button
                  className={`px-4 py-2 ${isUploading ? 'bg-green-600 text-white cursor-not-allowed' : 'bg-green-600 text-white'} rounded-lg text-sm font-medium hover:bg-green-700 transition`}
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <svg className="animate-spin h-5 w-5 mx-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Confirm'
                  )}
                </button>
                <button
                  className='px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition'
                  onClick={handleCancelUpload}
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showDuplicatePopup && (
          <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-60'>
            <div className='bg-white p-6 rounded-lg shadow-lg max-w-lg w-full'>
              <h2 className='text-2xl font-semibold text-gray-800 mb-4'>Duplicate Tokens Detected</h2>
              <p className='text-gray-700 mb-4'>The file contains duplicate tokens. Do you want to proceed with the submission?</p>
              <div className='flex justify-end gap-3'>
                <button
                  className='px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition'
                  onClick={handleAllowDuplicates}
                >
                  Yes, Allow Duplicates
                </button>
                <button
                  className='px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition'
                  onClick={handleDisallowDuplicates}
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </div>
        )}


        {showDisconnectPopup && (
          <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-60'>
            <div className='bg-white p-6 rounded-lg shadow-lg max-w-lg w-full'>
              <h2 className='text-2xl font-semibold text-gray-800 mb-4'>Disconnect Wallet</h2>
              <p className='text-gray-700 mb-4'>Are you sure you want to disconnect your wallet?</p>
              <div className='flex justify-end gap-3'>
                <button
                  className='px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition'
                  onClick={handleConfirmDisconnect}
                >
                  Yes, Disconnect
                </button>
                <button
                  className='px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition'
                  onClick={handleCancelDisconnect}
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
