
export async function getAllUserAssets(state) {
  let indexerClient = new algosdk.Indexer(state.token, state.indexerServer, state.port);
  if (state?.user?.account) {
    return await indexerClient.lookupAccountAssets(state?.user?.account).do()
      .catch((e) => {
        console.error(e);
      })
  }
}

export async function getAllAdminAssets(state) {
  let indexerClient = new algosdk.Indexer(state.token, state.indexerServer, state.port);
  return await indexerClient.lookupAccountAssets(state.adminAddress).do()
    .catch((e) => {
      console.error(e);
    })
}

export async function loadContract(state) {
  const algodClient = new algosdk.Algodv2(state.token, state.algodServer, state.port);
  return await algodClient.getApplicationByID(state.contractApplictionId).do()
    .catch((e) => {
      console.error(e);
    })
}

export async function contractBalance(state) {
  const algodClient = new algosdk.Algodv2(state.token, state.algodServer, state.port);
  return await algodClient.accountInformation(state.contractAddress).do()
    .catch((e) => {
      console.error(e);
    })
}

// export async function getEachAssetInfoAdminMainnet(state, assetId) {
//   let indexerClient = new algosdk.Indexer(state.token, state.indexerServerMainet, state.port);
//   return await indexerClient.searchForAssets().index(assetId).do()
// }

export async function getAllEscrowAssets(state) {
  let indexerClient = new algosdk.Indexer(state.token, state.indexerServer, state.port);
  return await indexerClient.lookupAccountAssets(state.escrowAddress).do()
    .catch((e) => {
      console.error(e);
    })
}

export async function getEachAssetInfo(state, assetId) {
  let indexerClient = new algosdk.Indexer(state.token, state.indexerServer, state.port);
  return await indexerClient.searchForAssets().index(assetId).do()
}

export async function getStakingAssetDetails(state) {
  try {
    let data = await fetch(`${state?.serverUrl}/get-staking-details`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    let response = await data.json();
    return response.data;
  }
  catch (error) {
    // console.log(error)
    return;
  }
}

export async function getAssetDetailsDb(state) {
  try {
    let data = await fetch(`${state?.serverUrl}/get-asset-data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    let response = await data.json();
    return response.data;
  }
  catch (error) {
    // console.log(error)
    return;
  }
}
export function algoToMicroAlgo(algo) {
  return +(algo / 1000000);
}
export function microAlgoToAlgo(microAlgo) {
  // console.log("price", microAlgo)
  // microAlgo = microAlgo / 100000;
  // microAlgo = +microAlgo.toString().substring(0, 5);
  // console.log("microAlgo", microAlgo)
  // return microAlgo;

  return +(microAlgo * 1000000);
}