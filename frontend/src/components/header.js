import { useState, useContext, useEffect } from "react";
import WalletContext from "../../context/WalletContext";
// import MyAlgoConnect from '@randlabs/myalgo-connect';
import Link from "next/link";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {PeraWalletConnect} from "@perawallet/connect"
const Header = (props) => {
  let { state, dispatch } = useContext(WalletContext);
  let [showWalletConnectModal, setShowWalletConnectModal] = useState(false);
  let [showWalletConnectDiv, setShowWalletConnectDiv] = useState(true);
  let [userAccounts, setUserAccounts] = useState([]);
  let [showWalletDisconnectDiv, setShowWalletDisconnectDiv] = useState(false);
  let [showAccountSelectModal, setShowAccountSelectModal] = useState(false);
  let [provider, setProvider] = useState("");
  let [isAlgoSignerInstalled, setIsAlgoSignerInstalled] = useState(false);
  const showToastSuccess = (message) => toast.success(message);
  const showToastError = (message) => toast.error(message);

  const handleWalletConnectModal = () => {
    setShowWalletConnectModal((previousState) => !previousState)
  };

  const handleSelectAccountModal = () => {
    setShowAccountSelectModal(previousState => !previousState)
  };

  useEffect(() => { // checking local storage
    dispatch({
      type: "USER_ACCOUNT",
      payload: { account: localStorage.getItem("account") },
    });
    dispatch({
      type: "USER_WALLET",
      payload: { wallet: localStorage.getItem("wallet") },
    });
  }, [state?.user?.account, state?.user?.wallet])

  useEffect(() => { // for div of connect wallet
    if (state?.user?.account && state?.user?.wallet) {
      setShowWalletConnectDiv(false);
      setShowWalletDisconnectDiv(true);
    }
  }, [state?.user?.account, state?.user?.wallet])

  useEffect(() => { // for div of connect wallet
    if (typeof AlgoSigner !== "undefined") {
      setIsAlgoSignerInstalled(true);
    } else {
      setIsAlgoSignerInstalled(false);
    }

  }, [])

  const handleConnectAccount = (accountAddress) => {
    dispatch({
      type: "USER_ACCOUNT",
      payload: { account: accountAddress },
    });
    localStorage.setItem("account", accountAddress)
    handleSelectAccountModal()
  };

  async function disconnectWallet() {

    dispatch({
      type: "USER_WALLET",
      payload: { wallet: "" },
    });
    localStorage.setItem("wallet", "")

    dispatch({
      type: "USER_ACCOUNT",
      payload: { account: "" },
    });
    localStorage.setItem("account", "")
    setShowWalletConnectDiv(true);
    setShowWalletDisconnectDiv(false);
    location.reload()
  }

  const connectWalletHandle = (wallet) => {
    changeProvider("");
    if (wallet === "algosigner") {
      changeProvider(window.ethereum);
      algoSignerConnect()
    } else if (wallet === "myalgo") {
      changeProvider(window.ethereum);
      myAlgoConnect()
    }else if (wallet == "perawallet"){
      changeProvider(window.ethereum);
      peraWalletConnection();
    }
  };

  const changeProvider = (newProvider) => {
    provider = newProvider;
  };

  async function algoSignerConnect() {

    AlgoSigner.connect()
      .then((d) => {
        setShowWalletConnectDiv(false);
        setShowWalletDisconnectDiv(true);

        handleWalletConnectModal()

        // get wallet accounts
        AlgoSigner.accounts({
          ledger: 'TestNet'
        })
          .then((d) => {
            let accounts = d;

            // Append accounts to select account modal

            setShowAccountSelectModal(true);
            setUserAccounts(accounts);
            dispatch({
              type: "USER_WALLET",
              payload: { wallet: "algosigner" },
            });
            localStorage.setItem("wallet", "algosigner")

          })
          .catch((e) => {
            console.error(e);
          })
      })
      .catch((e) => {
        console.error(e);
        // if (e.toString().includes("cancelled")) {
        //   showToastError("Operation cancelled");
        //   setShowWalletConnectModal(false);
        //   return;
        // } else {
        //   console.error(e);
        //   return;
        // }
      })
  }

  async function myAlgoConnect() {
    let myAlgoConnect = new MyAlgoConnect();

    // const settings = {
    //   shouldSelectOneAccount: false,
    //   openManager: false
    // };

    myAlgoConnect.connect()
      .then((d) => {
        let accounts = d;
        setShowWalletConnectDiv(false);
        setShowWalletDisconnectDiv(true);

        handleWalletConnectModal()
        // Append accounts to select account modal
        setShowAccountSelectModal(true);
        setUserAccounts(accounts);
        dispatch({
          type: "USER_WALLET",
          payload: { wallet: "myalgo" },
        });
        localStorage.setItem("wallet", "myalgo")

      })
      .catch((e) => {
        if (e.toString().includes("cancelled")) {
          showToastError("Operation cancelled");
          setShowWalletConnectModal(false);
          return;
        } else {
          console.error(e);
          return;
        }
      })

    return;
  }

  const peraWalletConnection = async () => {
    const peraWallet = new PeraWalletConnect({
      shouldShowSignTxnToast: true,
      chainId: state?.peraWalletChainId
    });
    peraWallet
      .connect()
      .then((newAccounts) => {
        // Setup the disconnect event listener
        peraWallet.connector?.on("disconnect", disconnectWallet);

        let accounts = newAccounts.map(account => ({address: account}));
        setShowWalletConnectDiv(false);
        setShowWalletDisconnectDiv(true);

        handleWalletConnectModal()
        // Append accounts to select account modal
        setShowAccountSelectModal(true);
        setUserAccounts(accounts);

        dispatch({
          type: "USER_WALLET",
          payload: { wallet: "perawallet" },
        });
        localStorage.setItem("wallet", "perawallet")

      })
      .catch((error) => {
        // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
        // For the async/await syntax you MUST use try/catch
        if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
          // log the necessary errors
        }
      });
  }

  return (
    <>
      <ToastContainer />
      <div className="menu-area menu--style6">
        <div className="top-menu-area">
          <div className="container">
            <div className="row">
              {/* left logo */}
              <div className="col-lg-3 col-md-3 col-6 v_middle">
                <div className="logo">
                  <Link href="/">
                    <a>
                      <img
                        src="/images/logo.png"
                        alt="logo image"
                        className="img-fluid"
                      />
                    </a>
                  </Link>
                </div>
              </div>

              {/* right ul li */}
              <div className="col-lg-9 col-6 col-md-9 v_middle" style={{ display: "flex", justifyContent: "flex-end" }}>
                <div className="mainmenu">
                  <nav className="navbar navbar-expand-lg navbar-light mainmenu__menu">
                    <button
                      className="navbar-toggler"
                      type="button"
                      data-toggle="collapse"
                      data-target="#navbarNav7"
                      aria-controls="navbarNav7"
                      aria-expanded="false"
                      aria-label="Toggle navigation"
                    >
                      <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav7">
                      <ul className="navbar-nav">
                        <li>
                          <Link href="/"><a>HOME</a></Link>
                        </li>
                        <li>
                          <Link href="/myassets"><a>My Assets</a></Link>
                        </li>
                        <li>
                          <Link href="/buy-xcolor"><a>XCOLOR</a></Link>
                        </li>
                        <li>
                          <Link href="/market"><a>MARKET</a></Link>
                        </li>
                        <li>
                          <Link href="/pixel-art"><a>Pixel Art</a></Link>
                        </li>
                      </ul>
                    </div>
                  </nav>


                  {/* desktop connect/disconnect wallet div */}
                  <div
                    className="walletConnectDisconnectDivDesktop"
                    style={{ display: "flex" }}
                  >
                    <div
                      id="wallet-connect-div"
                      style={{
                        margin: "0 1em 0 0",
                        display: showWalletConnectDiv ? "flex" : "none",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <button
                        className="btn btn-lg btn--round btn-secondary"
                        style={{ textTransform: "uppercase", fontSize: "0.8em", lineHeight: "40px", border: "none" }}
                        id="wallet-connect-button"
                        onClick={handleWalletConnectModal}
                      >
                        Connect Wallet
                      </button>
                    </div>

                    <div
                      style={{
                        margin: "0 1em 0 0",
                        display: showWalletDisconnectDiv ? "flex" : "none",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <button
                        className="btn btn-lg btn--round btn-secondary"
                        style={{ textTransform: "uppercase", fontSize: "0.8em", lineHeight: "40px", border: "none" }}
                        onClick={disconnectWallet}
                      >
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>


                </div>
              </div>

              {/* mobile connect/disconnect wallet div */}
              <div
                className="walletConnectDisconnectDivMobile"
                style={{ width: "100%", display: "none" }}
              >
                <div
                  className="col-12"
                  id="wallet-connect-div"
                  style={{
                    margin: "1em 0",
                    display: showWalletConnectDiv ? "flex" : "none",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <button
                    className="btn btn-lg btn--round btn-secondary"
                    style={{ textTransform: "uppercase", fontSize: "0.8em", lineHeight: "40px", border: "none" }}
                    id="wallet-connect-button"
                    onClick={handleWalletConnectModal}
                  >
                    Connect Wallet
                  </button>
                </div>

                <div
                  className="col-12"
                  style={{
                    margin: "1em 0",
                    display: showWalletDisconnectDiv ? "flex" : "none",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <button
                    className="btn btn-lg btn--round btn-secondary"
                    style={{ textTransform: "uppercase", fontSize: "0.8em", lineHeight: "40px", border: "none" }}
                    onClick={disconnectWallet}
                  >
                    Disconnect Wallet
                  </button>
                </div>

              </div>

              <div style={{ display: showWalletConnectModal ? "flex" : "none" }} id="connectWalletDiv">
                <div onClick={handleWalletConnectModal} className="overlay"></div>
                <div className="global-modal_contents modal-transition">
                  <div className="global-modal-header">
                    <h3>
                      <b>Connect to a Wallet</b>
                    </h3>
                    <span onClick={handleWalletConnectModal} className="mobile-close">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                      >
                        <path d="M0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256zM175 208.1L222.1 255.1L175 303C165.7 312.4 165.7 327.6 175 336.1C184.4 346.3 199.6 346.3 208.1 336.1L255.1 289.9L303 336.1C312.4 346.3 327.6 346.3 336.1 336.1C346.3 327.6 346.3 312.4 336.1 303L289.9 255.1L336.1 208.1C346.3 199.6 346.3 184.4 336.1 175C327.6 165.7 312.4 165.7 303 175L255.1 222.1L208.1 175C199.6 165.7 184.4 165.7 175 175C165.7 184.4 165.7 199.6 175 208.1V208.1z" />
                      </svg>
                    </span>
                  </div>
                  <div className="global-modal-body">
                    {isAlgoSignerInstalled ?
                      (
                        <div
                          style={{ display: "flex", alignItems: "center" }}
                          onClick={() => connectWalletHandle('algosigner')}
                        >
                          <div>Algosigner</div>
                          <img
                            width="30"
                            height="30"
                            src="/images/svg/algosigner.png"
                          />
                        </div>
                      )
                      :
                      (
                        <div
                          style={{ display: "flex", cursor: "default", alignItems: "center" }}
                        >
                          <div style={{ color: "darkgrey" }}>Algosigner is not installed</div>
                          <img
                            width="30"
                            height="30"
                            src="/images/svg/algosigner.png"
                          />
                        </div>
                      )
                    }
                    <div
                      style={{ display: "flex", alignItems: "center" }}
                      onClick={() => connectWalletHandle('myalgo')}
                    >
                      <div>MyAlgo</div>
                      <img
                        width="30"
                        height="30"
                        src="/images/svg/myalgo.png"
                      />
                    </div>
                     <div
                      style={{ display: "flex", alignItems: "center" }}
                      onClick={() => connectWalletHandle('perawallet')}
                    >
                      <div>Pera Wallet</div>
                      <img
                        width="30"
                        height="30"
                        src="/images/perawallet.png"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: showAccountSelectModal ? "flex" : "none" }} id="connectAccountDiv">
                <div
                  onClick={handleSelectAccountModal}
                  className="overlay"
                ></div>
                <div className="global-modal_contents modal-transition">
                  <div className="global-modal-header">
                    <h3>
                      <b>Select An Account</b>
                    </h3>
                    <span
                      onClick={handleSelectAccountModal}
                      className="mobile-close"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                      >
                        <path d="M0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256zM175 208.1L222.1 255.1L175 303C165.7 312.4 165.7 327.6 175 336.1C184.4 346.3 199.6 346.3 208.1 336.1L255.1 289.9L303 336.1C312.4 346.3 327.6 346.3 336.1 336.1C346.3 327.6 346.3 312.4 336.1 303L289.9 255.1L336.1 208.1C346.3 199.6 346.3 184.4 336.1 175C327.6 165.7 312.4 165.7 303 175L255.1 222.1L208.1 175C199.6 165.7 184.4 165.7 175 175C165.7 184.4 165.7 199.6 175 208.1V208.1z" />
                      </svg>
                    </span>
                  </div>
                  <div
                    id="inside-container"
                    style={{ overflowY: "scroll", maxHeight: "70vh", paddingBottom: "2em" }}
                    className="global-modal-body"
                  >
                    {userAccounts.length && userAccounts?.map((eachAccount, index) => (
                      <div key={index} style={{ display: "flex", justifyContent: "center" }}>
                        <div style={{ overflow: "hidden", display: "flex", alignItems: "center" }} onClick={() => handleConnectAccount(eachAccount.address)}>
                          <div>{eachAccount.address.substring(0, 8)}....{eachAccount.address.substring(eachAccount.address.length - 8)}</div>
                        </div>
                      </div>
                    ))}

                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div >
    </>

  );
};

export default Header;
