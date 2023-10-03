let showWalletConnectModal = false;
let showAccountSelectModal = false;
let showPurchaseAssetModal = false;
let provider = "";

const handleWalletConnectModal = () => {
  showWalletConnectModal = !showWalletConnectModal
  if (showWalletConnectModal) document.getElementById("connectWalletDiv").style.display = "flex";
  else document.getElementById("connectWalletDiv").style.display = "none";
};

const handlePurchaseAssetModal = () => {
  showPurchaseAssetModal = !showPurchaseAssetModal
  if (showPurchaseAssetModal) document.getElementById("purchase-from-escrow-modal").style.display = "none";
  else document.getElementById("purchase-from-escrow-modal").style.display = "flex";
};

const handleSelectAccountModal = () => {
  showAccountSelectModal = !showAccountSelectModal
  if (showAccountSelectModal) document.getElementById("connectAccountDiv").style.display = "none";
  else document.getElementById("connectAccountDiv").style.display = "flex";
};

const handleConnectAccount = (accountAddress) => {
  localStorage.setItem("account", accountAddress)
  handleSelectAccountModal()
};

const changeProvider = (newProvider) => {
  provider = newProvider;
};

const connectWalletHandle = (wallet) => {
  changeProvider("");
  console.log("connecting Wallet", wallet);
  if (wallet === "algosigner") {
    changeProvider(window.ethereum);
    console.log("provider", provider);
    algoSignerConnect()
  } else if (wallet === "myalgo") {
    changeProvider(window.ethereum);
    console.log("provider", provider);
    myAlgoWalletConnect()
  }
};


hljs.initHighlightingOnLoad();

let txParamsJS = {};
let algodClient = {};
let indexerClient = {};
let tnAccounts = [];
let assetsList = [];
let signedTxs;
let tx = {};

const algodServer = 'https://testnet-algorand.api.purestake.io/ps2';
const indexerServer = 'https://testnet-algorand.api.purestake.io/idx2';
const indexerServerMainet = 'https://mainnet-algorand.api.purestake.io/idx2';
const token = { 'X-API-Key': 'bWjiEafUWi7BRzUMCwTaj7cU3MrVzb6o1V16MOwd' }
const port = '';
const myAlgoConnect = new MyAlgoConnect({ disableLedgerNano: false });

algodClient = new algosdk.Algodv2(token, algodServer, port);
indexerClient = new algosdk.Indexer(token, indexerServer, port);
indexerClientMainet = new algosdk.Indexer(token, indexerServerMainet, port);

// states
let adminAddress = "KS5D4AO3Q6KBNIFEPFEBGX23LWJUNRMALSOXSEPF4P3LMYSQWCGTYC7RMY";
let escrowAddress = "Y4AJ3CQKMST6G7ZBSY2UYBLE7MX4OEZZFP5YLAFQVOYD66YZY3FJ4H6XQU";
let userAddress = localStorage.getItem("account");
let allUserAssets;

// for Each Asset page
(async () => {
  let assetIdFromQueryString = window.location.search.split("?")[window.location.search.split("?").length - 1]
  let assetInfo;
  allUserAssets = await getAllUserAssets();
  if (assetIdFromQueryString) assetInfo = await getEachAssetInfo(assetIdFromQueryString);
  // console.log("eachAsetinfo", assetInfo?.assets[0])
  // console.log("allUserAssets", allUserAssets)

  let isUserHaveThisAsset = allUserAssets?.assets?.filter((eachAsset) => eachAsset["asset-id"] == assetIdFromQueryString)[0];
  // console.log("is", isUserHaveThisAsset)

  let ownerAddressDiv = document.getElementById("owner-address");
  let totalAmount = document.getElementById("total-amount");
  let assetColorCodeHeading = document.getElementById("asset-color-code-heading");
  let colorCodeDiv = document.getElementById("color-code-div");
  let loadingHeading = document.getElementById("loading-heading");
  let purchaseNowButtonContainer = document.getElementById("purchase-now-button-container");
  let loadingPurchaseButton = document.getElementById("loading-purchase-button");

  if (ownerAddressDiv) ownerAddressDiv.innerHTML = `${adminAddress.substring(0, 3)}...${adminAddress.substring(adminAddress.length - 3)}`
  if (totalAmount) totalAmount.innerHTML = assetIdFromQueryString;
  if (assetColorCodeHeading) assetColorCodeHeading.innerHTML = assetInfo?.assets[0].params["unit-name"];
  if (loadingHeading) colorCodeDiv.removeChild(loadingHeading);
  if (colorCodeDiv) colorCodeDiv.style.backgroundColor = assetInfo?.assets[0].params["unit-name"];

  let newDivForButton = document.createElement("div")
  if (purchaseNowButtonContainer) {
    purchaseNowButtonContainer.removeChild(loadingPurchaseButton);

    // Checking if user already opted in or have this asset in wallet 
    if (isUserHaveThisAsset) {
      newDivForButton.innerHTML = `
        <div onclick="purchaseFromEscrow(${false})" id="purchase-from-escrow-btn" class="purchase-button">
          <a href="#" class="btn btn--lg btn--round" style="background:#7347c1;">Purchase Now</a>
        </div>
      `
    } else {
      newDivForButton.innerHTML = `
        <div onclick="optIn()" id="optIn-from-escrow-btn" class="purchase-button">
          <a href="#" class="btn btn--lg btn--round" style="background:#7347c1;">Opt-in</a>
        </div>
      `
    }

    purchaseNowButtonContainer.appendChild(newDivForButton);
  }


})().catch(e => {
  console.log(e);
});

async function getEachAssetInfo(assetId) {
  return await indexerClient.searchForAssets().index(assetId).do()
}
let tempCount = 0;

// search all assets of admin address for main page
function getAllAdminAssets() {
  indexerClient.lookupAccountAssets(adminAddress).do()
    .then((assetsData) => {
      // console.log("assetsData", assetsData)
      let loadingNftsDiv = document.getElementById("loading-nfts-admin-div");

      if (loadingNftsDiv) loadingNftsDiv.style.display = "none";

      assetsData.assets.slice(0, 2).map(async (eachAsset) => {
        // console.log("Each Asset", eachAsset)
        tempCount++;

        let mainContainer = document.getElementById("main-nfts-admin-container");
        let assetInfo;

        if (tempCount < 10) assetInfo = await getEachAssetInfo(eachAsset["asset-id"])

        let newDiv = document.createElement("div");
        newDiv.setAttribute("class", "col-lg-4 col-md-6")

        if (eachAsset["is-frozen"]) { //frozen aseset
          newDiv.innerHTML = `
            <div class="product product--card product--card3">
              <div class="product__thumbnail" style="display:flex; justify-content:center; align-items:center; background-color:${assetInfo?.assets[0]?.params["unit-name"]};">
                <h3 style="font-weight:bold;">Frozen</h3>
              </div>
              <div style="border-top:2px dotted grey;" class="product-desc">
                <a class="product_title">
                  <h4>${assetInfo?.assets[0]?.params["unit-name"]}</h4>
                </a>
                <ul class="titlebtm">
                  <li>
                    <p>
                      <a>Owned by</a>
                    </p>
                  </li>
                  <li class="product_cat">
                    <a>
                      <span class="lnr lnr-user"></span>${adminAddress.substring(0, 3)}...${adminAddress.substring(adminAddress.length - 3)}
                    </a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Amount: <a>${eachAsset.amount}</a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Asset id: <a>${eachAsset["asset-id"]}</a>
                  </li>
                </ul>
              </div>
            </div>
         `
        }
        else if (eachAsset.amount > 0) { // Not sold out
          newDiv.innerHTML = `
          <div class="product product--card product--card3">
            <div class="product__thumbnail" style="background-color:${assetInfo?.assets[0]?.params["unit-name"]};">
            </div>
            <div style="border-top:2px dotted grey;" class="product-desc">
              <a href="./single-product-v2.html?${eachAsset["asset-id"]}" class="product_title">
                <h4>${assetInfo?.assets[0]?.params["unit-name"]}</h4>
              </a>
              <ul class="titlebtm">
                <li>
                  <p>
                    <a>Owned by</a>
                  </p>
                </li>
                <li class="product_cat">
                  <a>
                    <span class="lnr lnr-user"></span>${adminAddress.substring(0, 3)}...${adminAddress.substring(adminAddress.length - 3)}
                  </a>
                </li>
                </br>
                <li class="product_cat">
                  Amount: <a>${eachAsset.amount}</a>
                </li>
                </br>
                <li class="product_cat">
                  Asset id: <a>${eachAsset["asset-id"]}</a>
                </li>
              </ul>
            </div>
          </div>
        `
        } else {//sold out
          newDiv.innerHTML = `
            <div class="product product--card product--card3">
              <div class="product__thumbnail" style="display:flex; justify-content:center; align-items:center; background-color:${assetInfo?.assets[0]?.params["unit-name"]};">
                <h3 style="font-weight:bold;">Sold Out</h3>
              </div>
              <div style="border-top:2px dotted grey;" class="product-desc">
                <a class="product_title">
                  <h4>${assetInfo?.assets[0]?.params["unit-name"]}</h4>
                </a>
                <ul class="titlebtm">
                  <li>
                    <p>
                      <a>Owned by</a>
                    </p>
                  </li>
                  <li class="product_cat">
                    <a>
                      <span class="lnr lnr-user"></span>${adminAddress.substring(0, 3)}...${adminAddress.substring(adminAddress.length - 3)}
                    </a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Amount: <a>${eachAsset.amount}</a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Asset id: <a>${eachAsset["asset-id"]}</a>
                  </li>
                </ul>
              </div>
            </div>
         `
        }

        if (mainContainer) mainContainer.appendChild(newDiv)



        // let newLi = document.createElement("li");
        // newLi.value = eachAsset["asset-id"]
        // newLi.innerText = `Id:${eachAsset["asset-id"]}`
        // newLi.style.cssText = "border:2px dotted blue; display:inline; margin:2em;"
        // // .appendChild
        // // document.getElementById("nfts").appendChild(newLi)

        // // Append assets to assets select
        // let assetsSelect = document.getElementById('asset');
        // let option = document.createElement('option');
        // option.text = eachAsset["asset-id"];
        // option.value = eachAsset["asset-id"];
        // // .appendChild
        // // assetsSelect.appendChild(option);

      })
    })
    .catch((e) => {
      console.error(e);
    })
}
getAllAdminAssets()


// search all assets of escrow address for main page
function getAllEscrowAssets() {
  indexerClient.lookupAccountAssets(escrowAddress).do()
    .then((assetsData) => {
      // console.log("assetsData escrow", assetsData)
      let loadingNftsDiv = document.getElementById("loading-nfts-escrow-div");

      if (loadingNftsDiv) loadingNftsDiv.style.display = "none";

      assetsData.assets.map(async (eachAsset) => {
        tempCount++;

        let mainContainer = document.getElementById("main-nfts-escrow-container");
        let assetInfo;

        if (tempCount < 10) assetInfo = await getEachAssetInfo(eachAsset["asset-id"])

        let newDiv = document.createElement("div");
        newDiv.setAttribute("class", "col-lg-4 col-md-6")
        if (eachAsset["is-frozen"]) { //frozen aseset
          newDiv.innerHTML = `
            <div class="product product--card product--card3">
              <div class="product__thumbnail" style="display:flex; justify-content:center; align-items:center; background-color:${assetInfo?.assets[0]?.params["unit-name"]};">
                <h3 style="font-weight:bold;">Frozen</h3>
              </div>
              <div style="border-top:2px dotted grey;" class="product-desc">
                <a class="product_title">
                  <h4>${assetInfo?.assets[0]?.params["unit-name"]}</h4>
                </a>
                <ul class="titlebtm">
                  <li>
                    <p>
                      <a>Owned by</a>
                    </p>
                  </li>
                  <li class="product_cat">
                    <a>
                      <span class="lnr lnr-user"></span>${adminAddress.substring(0, 3)}...${adminAddress.substring(adminAddress.length - 3)}
                    </a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Amount: <a>${eachAsset.amount}</a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Asset id: <a>${eachAsset["asset-id"]}</a>
                  </li>
                </ul>
              </div>
            </div>
         `
        }
        else if (eachAsset.amount > 0) { // Not sold out
          newDiv.innerHTML = `
          <div class="product product--card product--card3">
            <div class="product__thumbnail" style="background-color:${assetInfo?.assets[0]?.params["unit-name"]};">
            </div>
            <div style="border-top:2px dotted grey;" class="product-desc">
              <a href="./single-product-v2-escrow.html?${eachAsset["asset-id"]}" class="product_title">
                <h4>${assetInfo?.assets[0]?.params["unit-name"]}</h4>
              </a>
              <ul class="titlebtm">
                <li>
                  <p>
                    <a>Owned by</a>
                  </p>
                </li>
                <li class="product_cat">
                  <a>
                    <span class="lnr lnr-user"></span>${escrowAddress.substring(0, 3)}...${escrowAddress.substring(escrowAddress.length - 3)}
                  </a>
                </li>
                </br>
                <li class="product_cat">
                  Amount: <a>${eachAsset.amount}</a>
                </li>
                </br>
                <li class="product_cat">
                  Asset id: <a>${eachAsset["asset-id"]}</a>
                </li>
              </ul>
            </div>
          </div>
        `
        } else {//sold out
          newDiv.innerHTML = `
            <div class="product product--card product--card3">
              <div class="product__thumbnail" style="display:flex; justify-content:center; align-items:center; background-color:${assetInfo?.assets[0]?.params["unit-name"]};">
                <h3 style="font-weight:bold;">Sold Out</h3>
              </div>
              <div style="border-top:2px dotted grey;" class="product-desc">
                <a class="product_title">
                  <h4>${assetInfo?.assets[0]?.params["unit-name"]}</h4>
                </a>
                <ul class="titlebtm">
                  <li>
                    <p>
                      <a>Owned by</a>
                    </p>
                  </li>
                  <li class="product_cat">
                    <a>
                      <span class="lnr lnr-user"></span>${escrowAddress.substring(0, 3)}...${escrowAddress.substring(escrowAddress.length - 3)}
                    </a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Amount: <a>${eachAsset.amount}</a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Asset id: <a>${eachAsset["asset-id"]}</a>
                  </li>
                </ul>
              </div>
            </div>
         `
        }

        if (mainContainer) mainContainer.appendChild(newDiv)



        // let newLi = document.createElement("li");
        // newLi.value = eachAsset["asset-id"]
        // newLi.innerText = `Id:${eachAsset["asset-id"]}`
        // newLi.style.cssText = "border:2px dotted blue; display:inline; margin:2em;"
        // // .appendChild
        // // document.getElementById("nfts").appendChild(newLi)

        // // Append assets to assets select
        // let assetsSelect = document.getElementById('asset');
        // let option = document.createElement('option');
        // option.text = eachAsset["asset-id"];
        // option.value = eachAsset["asset-id"];
        // // .appendChild
        // // assetsSelect.appendChild(option);

      })
    })
    .catch((e) => {
      console.error(e);
    })
}
getAllEscrowAssets()


// search all assets of escrow address for main page
async function getAllUserAssets() {
  if (userAddress) {
    return await indexerClient.lookupAccountAssets(userAddress).do()
      .catch((e) => {
        console.error(e);
      })
  }
}

async function putUserAssetsInDom() {
  if (userAddress) {
    // console.log("assetsData", assetsData)
    let loadingNftsDiv = document.getElementById("loading-nfts-user-div");

    allUserAssets = await getAllUserAssets();
    // console.log("all user assets", allUserAssets)
    if (loadingNftsDiv) loadingNftsDiv.style.display = "none";
    allUserAssets.assets.map(async (eachAsset) => {
      tempCount++;

      let mainContainer = document.getElementById("main-nfts-user-container");
      let assetInfo;

      if (tempCount < 10) {
        assetInfo = await getEachAssetInfo(eachAsset["asset-id"])
        // console.log(assetInfo)
      }
      let newDiv = document.createElement("div");
      newDiv.setAttribute("class", "col-lg-4 col-md-6")
      if (eachAsset.amount > 0) { // Not sold out
        newDiv.innerHTML = `
          <div class="product product--card product--card3">
            <div class="product__thumbnail" style="background-color:${assetInfo?.assets[0]?.params["unit-name"]};">
            </div>
            <div style="border-top:2px dotted grey;" class="product-desc">
              <a class="product_title">
                <h4>${assetInfo?.assets[0]?.params["unit-name"]}</h4>
              </a>
              <ul class="titlebtm">
                <li>
                  <p>
                    <a>Owned by</a>
                  </p>
                </li>
                <li class="product_cat">
                  <a>
                    <span class="lnr lnr-user"></span>${userAddress.substring(0, 3)}...${userAddress.substring(userAddress.length - 3)}
                  </a>
                </li>
                </br>
                <li class="product_cat">
                  Amount: <a>${eachAsset.amount}</a>
                </li>
                </br>
                <li class="product_cat">
                  Asset id: <a>${eachAsset["asset-id"]}</a>
                </li>
              </ul>
            </div>
          </div>
        `
      } else {  //sold out
        newDiv.innerHTML = `
            <div class="product product--card product--card3">
              <div class="product__thumbnail" style="display:flex; justify-content:center; align-items:center; background-color:${assetInfo?.assets[0]?.params["unit-name"]};">
                <h3 style="font-weight:bold;">Sold Out</h3>
              </div>
              <div style="border-top:2px dotted grey;" class="product-desc">
                <a class="product_title">
                  <h4>${assetInfo?.assets[0]?.params["unit-name"]}</h4>
                </a>
                <ul class="titlebtm">
                  <li>
                    <p>
                      <a>Owned by</a>
                    </p>
                  </li>
                  <li class="product_cat">
                    <a>
                      <span class="lnr lnr-user"></span>${userAddress.substring(0, 3)}...${userAddress.substring(userAddress.length - 3)}
                    </a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Amount: <a>${eachAsset.amount}</a>
                  </li>
                  </br>
                  <li class="product_cat">
                    Asset id: <a>${eachAsset["asset-id"]}</a>
                  </li>
                </ul>
              </div>
            </div>
         `
      }

      if (mainContainer) mainContainer.appendChild(newDiv)

      // let newLi = document.createElement("li");
      // newLi.value = eachAsset["asset-id"]
      // newLi.innerText = `Id:${eachAsset["asset-id"]}`
      // newLi.style.cssText = "border:2px dotted blue; display:inline; margin:2em;"
      // // .appendChild
      // // document.getElementById("nfts").appendChild(newLi)

      // // Append assets to assets select
      // let assetsSelect = document.getElementById('asset');
      // let option = document.createElement('option');
      // option.text = eachAsset["asset-id"];
      // option.value = eachAsset["asset-id"];
      // // .appendChild
      // // assetsSelect.appendChild(option);

    })
  }
  else {
    let mainContainer = document.getElementById("main-nfts-user-container");
    let loadingNftsDiv = document.getElementById("loading-nfts-user-div");

    if (loadingNftsDiv) loadingNftsDiv.style.display = "none";
    let newDiv = document.createElement("div");
    newDiv.setAttribute("class", "col-lg-12 col-md-6")
    newDiv.innerHTML = `
        <div class="product product--card product--card3">
          <div style="display:flex; justify-content:center;" class="product-desc">
            <h4>Wallet not connected</h4>
          </div>
        </div>
      `
    if (mainContainer) mainContainer.appendChild(newDiv)
  }
}
if (document.getElementById("loading-nfts-user-div")) putUserAssetsInDom()


// Helper used with JSON.stringify that replaces Uint8Array data with ascii text for display
function toJsonReplace(key, value) {
  // Return value immediately if null or undefined
  if (value === undefined || value === null) {
    return value;
  }

  // Check for uint8 arrays to get buffer for print
  if (value instanceof Uint8Array || (typeof (value) === 'object' && value instanceof Array && value.length > 0 && typeof (value[0]) === 'number')) {
    // We have a key that is an address type then use the sdk base 58 method, otherwise use base64
    const addressKeys = ['rcv', 'snd', 'to', 'from', 'manager', 'reserve', 'freeze', 'clawback', 'c', 'f', 'r', 'm', 'asnd', 'arcv', 'aclose', 'fadd'];
    if (key && addressKeys.includes(key)) {
      return algosdk.encodeAddress(value);
    }
    return btoa(value);
  }

  // Check for literal string match on object type to cycle further into the recursive replace
  if (typeof (value) === '[object Object]') {
    return JSON.stringify(value, _toJsonReplace, 2);
  }

  // Return without modification
  return value;
}

(function checkWalletConnection() {


  let walletConnectDiv = document.getElementById('wallet-connect-div');
  let walletConnectBtn = document.getElementById('wallet-connect-button');
  let walletDisconnectDiv = document.getElementById('wallet-disconnect-div');
  let walletDisconnectBtn = document.getElementById('wallet-disconnect-button');

  let userWallet = localStorage.getItem("wallet")

  if (userWallet !== "") {
    walletConnectDiv.style.display = "none";
    walletDisconnectDiv.style.display = "flex";
  }


})()

async function disconnectWallet() {
  let walletConnectDiv = document.getElementById('wallet-connect-div');
  let walletConnectBtn = document.getElementById('wallet-connect-button');
  let walletDisconnectDiv = document.getElementById('wallet-disconnect-div');
  let walletDisconnectBtn = document.getElementById('wallet-disconnect-button');

  localStorage.setItem("wallet", "")
  localStorage.setItem("account", "")
  walletConnectDiv.style.display = "flex";
  walletDisconnectDiv.style.display = "none";
  location.reload()
}


async function algoSignerConnect() {
  let walletConnectDiv = document.getElementById('wallet-connect-div');
  let walletConnectBtn = document.getElementById('wallet-connect-button');
  let walletDisconnectDiv = document.getElementById('wallet-disconnect-div');
  let walletDisconnectBtn = document.getElementById('wallet-disconnect-button');

  AlgoSigner.connect()
    .then((d) => {
      console.log("connect", d)
      walletConnectDiv.style.display = "none";
      walletDisconnectDiv.style.display = "flex";

      handleWalletConnectModal()

      // get wallet accounts
      AlgoSigner.accounts({
        ledger: 'TestNet'
      })
        .then((d) => {
          accounts = d;
          console.log("Accounts ", accounts)

          // Append accounts to select account modal
          let main = document.getElementById('connectAccountDiv');
          main.style.display = "flex";

          let insideContainer = document.getElementById('inside-container');
          accounts.map((eachAccount) => {
            let newDiv = document.createElement("div");
            newDiv.style.justifyContent = "center";

            newDiv.innerHTML = `
              <div style="overflow:hidden; display: flex; align-items: center;" onclick="handleConnectAccount('${eachAccount.address}')">
                <div>${eachAccount.address.substring(0, 8)}....${eachAccount.address.substring(eachAccount.address.length - 8)}</div>
              </div>
            `
            insideContainer.appendChild(newDiv)
          })

          localStorage.setItem("wallet", "algosigner");

        })
        .catch((e) => {
          console.error(e);
        })
    })
    .catch((e) => {
      console.error(e);
      // connectCodeElem.innerHTML = JSON.stringify(e, null, 2);
    })
    .finally(() => {
      // hljs.highlightBlock(connectCodeElem);
    });
}

async function myAlgoWalletConnect() {
  let walletConnectDiv = document.getElementById('wallet-connect-div');
  let walletConnectBtn = document.getElementById('wallet-connect-button');
  let walletDisconnectDiv = document.getElementById('wallet-disconnect-div');
  let walletDisconnectBtn = document.getElementById('wallet-disconnect-button');

  const settings = {
    shouldSelectOneAccount: false,
    openManager: false
  };

  myAlgoConnect.connect(settings)
    .then((d) => {
      let accounts = d;
      walletConnectDiv.style.display = "none";
      walletDisconnectDiv.style.display = "flex";

      handleWalletConnectModal()
      // Append accounts to select account modal
      let main = document.getElementById('connectAccountDiv');
      main.style.display = "flex";

      let insideContainer = document.getElementById('inside-container');
      accounts.map((eachAccount) => {
        let newDiv = document.createElement("div");
        newDiv.style.justifyContent = "center";

        newDiv.innerHTML = `
          <div style="overflow:hidden; display: flex; align-items: center;" onclick="handleConnectAccount('${eachAccount.address}')">
            <div>${eachAccount.address.substring(0, 8)}....${eachAccount.address.substring(eachAccount.address.length - 8)}</div>
          </div>
        `
        insideContainer.appendChild(newDiv)
      })

      localStorage.setItem("wallet", "myalgo")

    })
    .catch((e) => {
      console.error(e);
    })

  return;
}

function status() {
  let statusCodeElem = document.getElementById('status-code');

  algodClient.status().do()
    .then((d) => {
      statusCodeElem.innerHTML = JSON.stringify(d, null, 2);
    })
    .catch((e) => {
      console.error(e);
      statusCodeElem.innerHTML = JSON.stringify(e, null, 2);
    })
    .finally(() => {
      hljs.highlightBlock(statusCodeElem);
    });
}

function assets() {
  let assetsCodeElem = document.getElementById('assets-code');

  const name = document.getElementById('name').value;
  const limit = document.getElementById('limit').value;

  indexerClient.searchForAssets()
    .limit(limit)
    .name(name)
    .do()
    .then((d) => {
      assetsCodeElem.innerHTML = JSON.stringify(d, null, 2);

      // Append assets to assets select
      let select = document.getElementById('asset');
      select.textContent = '';
      for (var i = assetsList.length - 1; i >= 0; i--) {
        let option = document.createElement('option');
        option.text = assetsList[i].params.name || assetsList[i].index;
        option.value = assetsList[i].index;
        // .appendChild
        // select.appendChild(option);
      }
    })
    .catch((e) => {
      console.error(e);
      assetsCodeElem.innerHTML = JSON.stringify(e, null, 2);
    })
    .finally(() => {
      hljs.highlightBlock(assetsCodeElem);
    });
}

function optIn(note = "No note provided") { //opt in function
  let assetId = window.location.search.split("?")[window.location.search.split("?").length - 1]

  algodClient.getTransactionParams().do()
    .then((d) => {
      txParamsJS = d;

      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: userAddress,
        to: userAddress,
        assetIndex: +assetId,
        note: AlgoSigner.encoding.stringToByteArray(note),
        amount: 0,
        suggestedParams: { ...txParamsJS }
      });

      if (localStorage.getItem("wallet") == "myalgo") {
        myAlgoConnect.signTransaction(txn.toByte())
          .then((signedTxs) => {
            algodClient.sendRawTransaction(signedTxs.blob).do()
              .then((txn) => {
                // display purchase modal
                document.getElementById("purchase-from-escrow-modal").style.display = "flex";
                // { txId: "IMXOKHFRXGJUBDNOHYB5H6HASYACQ3PE5R6VFWLW4QHARFWLTVTQ" }
              })
              .catch((err) => {
                console.error("error", err)
              })
          })
          .catch((err) => {
            console.error("error", err)
          })
      } else {

        // Use the AlgoSigner encoding library to make the transactions base64
        const txn_b64 = AlgoSigner.encoding.msgpackToBase64(txn.toByte());

        AlgoSigner.signTxn([{ txn: txn_b64 }])
          .then((d) => {
            signedTxs = d;
            console.log("signedTxs", d)

            AlgoSigner.send({
              ledger: 'TestNet',
              tx: signedTxs[0].blob
            })
              .then((d) => {
                tx = d;
                console.log("Sended Tx", d)
                document.getElementById("purchase-from-escrow-modal").style.display = "flex";
              })
              .catch((e) => {
                console.error(e);
              })
          })
          .catch((e) => {
            console.error("error", e);
          })
      }
    })
    .catch((e) => {
      console.error(e);
    })
}
// optIn()
function signPaymentTransaction() {
  // getting params
  algodClient.getTransactionParams().do()
    .then((d) => {
      txParamsJS = d;

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: document.getElementById('from-pay').value,
        to: document.getElementById('to-pay').value,
        amount: +document.getElementById('amount-pay').value,
        note: AlgoSigner.encoding.stringToByteArray(document.getElementById('note-pay').value),
        suggestedParams: { ...txParamsJS }
      });

      if (localStorage.getItem("wallet") == "myalgo") {
        myAlgoConnect.signTransaction(txn.toByte())
          .then((signedTxs) => {
            console.log("test", signedTxs)
            algodClient.sendRawTransaction(signedTxs.blob).do()
              .then((txn) => {
                console.log("MINE", txn);
                data = {
                  "txId": tx,
                  "receiverAddr": document.getElementById('from-pay').value,
                  "assetId": 75386913
                }
                if (document.getElementById('to-pay').value == "Y4AJ3CQKMST6G7ZBSY2UYBLE7MX4OEZZFP5YLAFQVOYD66YZY3FJ4H6XQU") { //escrow address
                  fetch('http://localhost:5000/receive-asset-from-escrow', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                  })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Success:', data);
                    })
                    .catch((error) => {
                      console.error('Error:', error);
                    });

                } else { // not an escrow
                  fetch('http://localhost:5000/receive-asset', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                  })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Success:', data);
                    })
                    .catch((error) => {
                      console.error('Error:', error);
                    });
                }
                // { txId: "IMXOKHFRXGJUBDNOHYB5H6HASYACQ3PE5R6VFWLW4QHARFWLTVTQ" }
              })
              .catch((err) => {
                console.error("error", err)
              })
          })
          .catch((err) => {
            console.error("error", err)
          })

      }
      else {
        // Use the AlgoSigner encoding library to make the transactions base64
        let txn_b64 = AlgoSigner.encoding.msgpackToBase64(txn.toByte());
        AlgoSigner.signTxn([{ txn: txn_b64 }])
          .then((d) => {
            signedTxs = d;
            console.log("signedTxs", signedTxs)
            AlgoSigner.send({
              ledger: 'TestNet',
              tx: signedTxs[0].blob
            })
              .then((d) => {
                tx = d;
                data = {
                  "txId": tx,
                  "receiverAddr": document.getElementById('from-pay').value,
                  "assetId": 75386913
                }
                if (document.getElementById('to-pay').value == "Y4AJ3CQKMST6G7ZBSY2UYBLE7MX4OEZZFP5YLAFQVOYD66YZY3FJ4H6XQU") { //escrow address
                  fetch('http://localhost:5000/receive-asset-from-escrow', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                  })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Success:', data);
                    })
                    .catch((error) => {
                      console.error('Error:', error);
                    });

                } else { // not an escrow
                  fetch('http://localhost:5000/receive-asset', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                  })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Success:', data);
                    })
                    .catch((error) => {
                      console.error('Error:', error);
                    });
                }
              })
              .catch((e) => {
                console.error(e);
              })

          })
          .catch((e) => {
            console.error(e);
          })
      }

    })
    .catch((e) => {
      console.error(e);
    })
}
function purchaseFromAdmin() {
  // getting params
  algodClient.getTransactionParams().do()
    .then((d) => {
      txParamsJS = d;

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: localStorage.getItem("account"),
        to: adminAddress,
        amount: 1000,
        // note: AlgoSigner.encoding.stringToByteArray(document.getElementById('note-pay').value),
        suggestedParams: { ...txParamsJS }
      });

      if (localStorage.getItem("wallet") == "myalgo") {
        myAlgoConnect.signTransaction(txn.toByte())
          .then((signedTxs) => {
            console.log("test", signedTxs)
            algodClient.sendRawTransaction(signedTxs.blob).do()
              .then((txn) => {
                console.log("MINE", txn);
                data = {
                  "txId": txn,
                  "receiverAddr": localStorage.getItem("account"),
                  "assetId": Number(window.location.search.split("?")[window.location.search.split("?").length - 1])
                }
                if ("document.getElementById('to-pay').value" == "Y4AJ3CQKMST6G7ZBSY2UYBLE7MX4OEZZFP5YLAFQVOYD66YZY3FJ4H6XQU") { //escrow address
                  fetch('http://localhost:5000/receive-asset-from-escrow', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                  })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Success:', data);
                    })
                    .catch((error) => {
                      console.error('Error:', error);
                    });

                } else { // not an escrow
                  fetch('http://localhost:5000/receive-asset', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                  })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Success:', data);
                    })
                    .catch((error) => {
                      console.error('Error:', error);
                    });
                }
                // { txId: "IMXOKHFRXGJUBDNOHYB5H6HASYACQ3PE5R6VFWLW4QHARFWLTVTQ" }
              })
              .catch((err) => {
                console.error("error", err)
              })
          })
          .catch((err) => {
            console.error("error", err)
          })

      }
      else {
        // Use the AlgoSigner encoding library to make the transactions base64
        let txn_b64 = AlgoSigner.encoding.msgpackToBase64(txn.toByte());
        AlgoSigner.signTxn([{ txn: txn_b64 }])
          .then((d) => {
            signedTxs = d;
            console.log("signedTxs", signedTxs)
            AlgoSigner.send({
              ledger: 'TestNet',
              tx: signedTxs[0].blob
            })
              .then((d) => {
                tx = d;
                data = {
                  "txId": tx,
                  "receiverAddr": localStorage.getItem("account"),
                  "assetId": Number(window.location.search.split("?")[window.location.search.split("?").length - 1])
                }
                if ("document.getElementById('to-pay').value" == "Y4AJ3CQKMST6G7ZBSY2UYBLE7MX4OEZZFP5YLAFQVOYD66YZY3FJ4H6XQU") { //escrow address
                  fetch('http://localhost:5000/receive-asset-from-escrow', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                  })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Success:', data);
                    })
                    .catch((error) => {
                      console.error('Error:', error);
                    });

                } else { // not an escrow
                  fetch('http://localhost:5000/receive-asset', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                  })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Success:', data);
                    })
                    .catch((error) => {
                      console.error('Error:', error);
                    });
                }
              })
              .catch((e) => {
                console.error(e);
              })

          })
          .catch((e) => {
            console.error(e);
          })
      }

    })
    .catch((e) => {
      console.error(e);
    })
}
function purchaseFromEscrow(fromModal) {
  console.log("fromModal", fromModal)
  // getting params
  algodClient.getTransactionParams().do()
    .then((d) => {
      txParamsJS = d;

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: localStorage.getItem("account"),
        to: escrowAddress,
        amount: 1000,
        // note: AlgoSigner.encoding.stringToByteArray(document.getElementById('note-pay').value),
        suggestedParams: { ...txParamsJS }
      });

      if (localStorage.getItem("wallet") == "myalgo") {
        myAlgoConnect.signTransaction(txn.toByte())
          .then((signedTxs) => {
            console.log("test", signedTxs)
            algodClient.sendRawTransaction(signedTxs.blob).do()
              .then((txn) => {
                console.log("MINE", txn);
                data = {
                  "txId": txn,
                  "receiverAddr": localStorage.getItem("account"),
                  "assetId": Number(window.location.search.split("?")[window.location.search.split("?").length - 1])
                }
                fetch('http://localhost:5000/receive-asset-from-escrow', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(data),
                })
                  .then(response => response.json())
                  .then(data => {
                    console.log('Success:', data);
                    if (fromModal) {
                      handlePurchaseAssetModal();
                      window.location.href = "./index.html";
                    }
                  })
                  .catch((error) => {
                    console.error('Error:', error);
                  });
                // { txId: "IMXOKHFRXGJUBDNOHYB5H6HASYACQ3PE5R6VFWLW4QHARFWLTVTQ" }
              })
              .catch((err) => {
                console.error("error", err)
              })
          })
          .catch((err) => {
            console.error("error", err)
          })

      }
      else {
        // Use the AlgoSigner encoding library to make the transactions base64
        let txn_b64 = AlgoSigner.encoding.msgpackToBase64(txn.toByte());
        AlgoSigner.signTxn([{ txn: txn_b64 }])
          .then((d) => {
            signedTxs = d;
            console.log("signedTxs", signedTxs)
            AlgoSigner.send({
              ledger: 'TestNet',
              tx: signedTxs[0].blob
            })
              .then((d) => {
                tx = d;
                data = {
                  "txId": tx,
                  "receiverAddr": localStorage.getItem("account"),
                  "assetId": Number(window.location.search.split("?")[window.location.search.split("?").length - 1])
                }
                fetch('http://localhost:5000/receive-asset-from-escrow', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(data),
                })
                  .then(response => response.json())
                  .then(data => {
                    console.log('Success:', data);
                    // this will close modal if transaction is from modal
                    if (fromModal) {
                      handlePurchaseAssetModal();
                      window.location.href = "./index.html";
                    }
                  })
                  .catch((error) => {
                    console.error('Error:', error);
                  });
              })
              .catch((e) => {
                console.error(e);
              })

          })
          .catch((e) => {
            console.error(e);
          })
      }

    })
    .catch((e) => {
      console.error(e);
    })
}

////////// nft owner sending to escrow address
function ListMyAsset() {
  console.log("Executing asset index: 75380867",)

  algodClient.getTransactionParams().do() // getting params
    .then((d) => {
      txParamsJS = d;

      data = {
        "ESCROW_ADDRESS": escrowAddress,
        "assetId": 75380867,
        "note": "Transferring to escrow"
      }

      fetch('http://localhost:5000/escrow-opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
        .then(response => response.json())
        .then(data => {
          console.log('Success:', data);

          let escrow_address = escrowAddress;
          let sender = adminAddress;

          const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: sender,
            to: escrow_address,
            assetIndex: 75380867,
            note: AlgoSigner.encoding.stringToByteArray("Transferring asset"),
            amount: 1,
            suggestedParams: { ...txParamsJS }
          });

          // Use the AlgoSigner encoding library to make the transactions base64
          const txn_b64 = AlgoSigner.encoding.msgpackToBase64(txn.toByte());

          AlgoSigner.signTxn([{ txn: txn_b64 }])
            .then((d) => {
              signedTxs = d;
              console.log("signedTxs", d)

              AlgoSigner.send({
                ledger: 'TestNet',
                tx: signedTxs[0].blob
              })
                .then((d) => {
                  tx = d;
                  console.log("Sended Tx", d)
                })
                .catch((e) => {
                  console.error(e);
                })
            })
            .catch((e) => {
              console.error("error", e);
            })
        })
        .catch((error) => {
          console.error('Error:', error);
        });

    })
    .catch((e) => {
      console.error("Error in getting params", e);
    })
}
// ListMyAsset()

// document.getElementById('optIn').addEventListener('click', optIn); // opt-in
// document.getElementById('sign-pay').addEventListener('click', signPaymentTransaction);
// document.getElementById('send').addEventListener('click', send);

// document.getElementById('check').addEventListener('click', check);
// document.getElementById('connect').addEventListener('click', connect);
// document.getElementById('accounts').addEventListener('click', accounts);
// document.getElementById('status').addEventListener('click', status);
// document.getElementById('assets').addEventListener('click', assets);
