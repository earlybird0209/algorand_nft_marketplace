import { useEffect, useState, useContext } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import Header from "../src/components/header";
import WalletContext from "../context/WalletContext";
import { getAllUserAssets, getAllAdminAssets, getAllEscrowAssets, getEachAssetInfo, getAssetDetailsDb, algoToMicroAlgo, microAlgoToAlgo, getEachAssetInfoAdminMainnet } from '../src/helpers'
import Footer from "../src/components/Footer";
import ReactPaginate from "react-paginate";
import adminJson from "../adminAssetsInfo.json";

export default function Index(props) {
  let { state, dispatch } = useContext(WalletContext);
  let [adminAssets, setAdminAssets] = useState([]);
  let [escrowAssets, setEscrowAssets] = useState([]);
  let [escrowFeaturedAssets, setEscrowFeaturedAssets] = useState([]);
  let [loadingAdminAssets, setLoadingAdminAssets] = useState(true);
  let [loadingEscrowAssets, setLoadingEscrowAssets] = useState(true);
  let [adminAllAssets, setAdminAllAssets] = useState({});

  useEffect(() => { // getting all admin assets
    console.log("Current env", process.env.NEXT_PUBLIC_CURRENT_ENV);
    getAllAdminAssets(state)
      .then(async (data) => {
        // removing frozen and sold out from data.assets
        data.assets = data?.assets?.filter((eachAsset) => (!eachAsset["is-frozen"]) && (eachAsset?.amount > 0));
        setAdminAllAssets(data);
      })
      .catch(console.error)
  }, [state?.adminAddress])

  useEffect(() => { // admin assets slicing
    setLoadingAdminAssets(true);
    async function temp() {
      if (Object.keys(adminAllAssets).length) {
        // let temp = adminAllAssets.assets;
        let temp = adminAllAssets.assets.slice(0, process.env.NEXT_PUBLIC_MAIN_PAGE_ADMIN_ASSETS_LIMIT);
        let mergedDataAdmin = [];
        for (let i = 0; i < temp.length; i++) {
          const assetInfoJson = adminJson.filter((eachAsset) => eachAsset.assetInfo["asset-id"] == temp[i]["asset-id"])[0];
          if (assetInfoJson) {
            mergedDataAdmin.push({ "assetInfo": { ...temp[i] }, "assetDetails": { ...assetInfoJson.assetDetails } })
          }

          // let assetInfo = await getEachAssetInfo(state, temp[i]["asset-id"])
          // mergedDataAdmin.push({ "assetInfo": { ...temp[i] }, "assetDetails": { ...assetInfo.assets[0] } })

        }
        // for adminAssetInfo.json file
        // console.log(JSON.stringify(mergedDataAdmin))

        setAdminAssets([...mergedDataAdmin])
        setLoadingAdminAssets(false);
      }
    }
    temp();
  }, [adminAllAssets])

  // useEffect(() => { // getting all escrow assets
  //   getAllEscrowAssets(state)
  //     .then(async (data) => {
  //       data.assets = data?.assets?.filter((eachAsset) => (!eachAsset["is-frozen"]) && (eachAsset?.amount > 0))
  //       let pricingDetails = await getAssetDetailsDb(state);
  //       let mergedDataEscrow = [];
  //       for (let i = 0; i < data.assets.length; i++) {
  //         let assetInfo = await getEachAssetInfo(state, data.assets[i]["asset-id"]);
  //         let temp = pricingDetails.filter((eachAsset) => eachAsset?.assetId == data.assets[i]["asset-id"])[0]
  //         mergedDataEscrow.push({ "assetInfo": { ...data.assets[i] }, "assetDetails": { ...assetInfo.assets[0] }, "pricing": { ...temp } })
  //       }
  //       let onlyFeatured = mergedDataEscrow?.filter((eachAsset) => eachAsset.pricing.isFeatured)
  //       onlyFeatured = onlyFeatured.slice(0, process.env.NEXT_PUBLIC_MAIN_PAGE_FEATURED_ASSETS_LIMIT) // slicing just to show only 9 featured assets on main page
  //       setEscrowFeaturedAssets(onlyFeatured)

  //       mergedDataEscrow = mergedDataEscrow.slice(0, process.env.NEXT_PUBLIC_MAIN_PAGE_ESCROW_ASSETS_LIMIT) // slicing just to show only limited escrow assets on main page
  //       setEscrowAssets(mergedDataEscrow)
  //       setLoadingEscrowAssets(false);
  //     })
  //     .catch(console.error)
  // }, [state?.escrowAddress])

  async function getEscrowData() { // getting all escrow assets
    let escrowDbData = await getAssetDetailsDb(state);
    let mergedDataEscrow = [];
    for (let i = 0; i < escrowDbData.length; i++) {
      const adminJsonData = adminJson.filter((eachAsset) => eachAsset.assetInfo["asset-id"] == escrowDbData[i].assetId)[0];
      mergedDataEscrow.push({ "assetInfo": { ...adminJsonData.assetInfo }, "assetDetails": { ...adminJsonData.assetDetails, params: { ...adminJsonData.assetDetails.params, name: adminJsonData.assetDetails.params.name.trim() } }, "pricing": { ...escrowDbData[i] } })
    }
    let onlyFeatured = mergedDataEscrow?.filter((eachAsset) => eachAsset.pricing.isFeatured)
    onlyFeatured = onlyFeatured.slice(0, process.env.NEXT_PUBLIC_MAIN_PAGE_FEATURED_ASSETS_LIMIT) // slicing just to show only 9 featured assets on main page
    setEscrowFeaturedAssets(onlyFeatured)

    mergedDataEscrow = mergedDataEscrow.slice(0, process.env.NEXT_PUBLIC_MAIN_PAGE_ESCROW_ASSETS_LIMIT) // slicing just to show only limited escrow assets on main page
    setEscrowAssets(mergedDataEscrow)
    setLoadingEscrowAssets(false);
  }

  useEffect(() => { // escrow
    getEscrowData();
  }, [state?.escrowAddress])

  return (
    <>
      <Head>
        <title>PiXColorand</title>
      </Head>
      <Header></Header>
      <section className="breadcrumb-area breadcrumb--center">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="page_title">
                <h3>Welcome to MartPlace Author</h3>
                <p>& Sell Your Products</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="products">

        <div className="container">

          {/* featured assets */}
          <div className="row">
            <div className="col-md-12">
              <div className="product-title-area">
                <div className="product__title">
                  <h2>Featured Assets</h2>
                </div>
              </div>
            </div>
          </div>
          <div id="main-nfts-escrow-container" className="row">
            {loadingEscrowAssets && (
              <div
                id="loading-nfts-admin-div"
                style={{ display: "flex", justifyContent: "center", padding: '4em 0' }}
                className="col-lg-12 col-md-12"
              >
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              </div>
            )}

            {escrowFeaturedAssets?.map((eachEscrowAsset, ind) => {// featured and not sold out
              return (
                <div key={ind} className="col-lg-4 col-md-6">
                  <div className="product product--card product--card3">
                    <div className="product__thumbnail" style={{ boxShadow: "rgb(0 0 0 / 9%) 0px 2px 4px", backgroundColor: eachEscrowAsset?.assetDetails?.params["unit-name"] }}></div>
                    <div className="product-desc">
                      <a style={{ width: "95%" }} href={`./asset/escrow/${eachEscrowAsset?.assetInfo["asset-id"]}`} className="product_title">
                        <div style={{
                          wordBreak: "break-word",
                          paddingRight: "0.4em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "22px",
                          color: "black",

                        }}
                        >
                          {eachEscrowAsset?.assetDetails?.params["name"]}
                        </div>
                      </a>
                      <ul className="titlebtm">
                        <li>
                          <p>
                            <a>Owned by</a>
                          </p>
                        </li>
                        <li className="product_cat">
                          <a>
                            <span className="lnr lnr-user"></span>
                            {eachEscrowAsset.pricing.owner.substring(0, 3)}...{eachEscrowAsset.pricing.owner.substring(eachEscrowAsset.pricing.owner.length - 3)}
                          </a>
                        </li>
                        {/* <br />
                          <li className="product_cat"> Amount: <a>{eachEscrowAsset?.assetInfo?.amount}</a></li> */}
                        <br />
                        <li className="product_cat">
                          Asset id: <a>{eachEscrowAsset?.assetInfo["asset-id"]}</a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })}

            {(!loadingEscrowAssets && !escrowAssets.length) && (<div
              id="loading-nfts-escrow-div"
              style={{ display: "flex", marginBottom: "1em" }}
              className="col-lg-12 col-md-12"
            >
              <h4>No Featured NFT's Listed Yet!</h4>
            </div>)}
          </div>

          {/* admin assets */}
          <div className="row">
            <div className="col-md-12">
              <div className="product-title-area">
                <div className="product__title">
                  <h2>Admin Assets</h2>
                </div>
              </div>
            </div>
          </div>
          <div id="main-nfts-admin-container" className="row">
            {loadingAdminAssets ?
              (
                <div
                  id="loading-nfts-admin-div"
                  style={{ display: "flex", justifyContent: "center", padding: '4em 0' }}
                  className="col-lg-12 col-md-12"
                >
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              )
              : ""}

            {!loadingAdminAssets && !adminAssets.length ?
              <div
                id="loading-nfts-escrow-div"
                style={{ display: "flex" }}
                className="col-lg-12 col-md-12 mb-4"
              >
                <h4>No NFT's Listed Yet!</h4>
              </div>
              : ""}


            {!loadingAdminAssets && adminAssets?.map((eachAdminAsset, index) => { // not sold out
              return (
                <div key={index} className="col-lg-4 col-md-6">
                  <div className="product product--card product--card3">
                    <div className="product__thumbnail" style={{ boxShadow: "rgb(0 0 0 / 9%) 0px 2px 4px", backgroundColor: eachAdminAsset?.assetDetails?.params["unit-name"] }}></div>
                    <div className="product-desc">
                      <a style={{ width: "95%" }} href={`./asset/${eachAdminAsset?.assetInfo["asset-id"]}`} className="product_title">
                        <div style={{
                          wordBreak: "break-word",
                          paddingRight: "0.4em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "22px",
                          color: "black",

                        }}
                        >
                          {eachAdminAsset?.assetDetails?.params["name"]}
                        </div>
                      </a>
                      <ul className="titlebtm">
                        <li>
                          <p>
                            <a>Owned by</a>
                          </p>
                        </li>
                        <li className="product_cat">
                          <a>
                            <span className="lnr lnr-user"></span>
                            {state.adminAddress.substring(0, 3)}...{state.adminAddress.substring(state.adminAddress.length - 3)}
                          </a>
                        </li>
                        <br />
                        {/* <li className="product_cat"> Amount: <a>{eachAdminAsset?.assetInfo?.amount}</a></li>
                          <br /> */}
                        <li className="product_cat">
                          Asset id: <a>{eachAdminAsset?.assetInfo["asset-id"]}</a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })}

          </div >

          {/* escrow assets */}
          <div className="row">
            <div className="col-md-12">
              <div className="product-title-area">
                <div className="product__title">
                  <h2>Escrow Assets</h2>
                </div>
              </div>
            </div>
          </div>
          <div id="main-nfts-escrow-container" className="row">
            {loadingEscrowAssets ? (
              <div
                id="loading-nfts-admin-div"
                style={{ display: "flex", justifyContent: "center", padding: '4em 0' }}
                className="col-lg-12 col-md-12"
              >
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              </div>
            ) : ""}

            {escrowAssets?.map((eachEscrowAsset, ind) => { // not sold out
              return (
                <div key={ind} className="col-lg-4 col-md-6">
                  <div className="product product--card product--card3">
                    <div className="product__thumbnail" style={{ boxShadow: "rgb(0 0 0 / 9%) 0px 2px 4px", backgroundColor: eachEscrowAsset?.assetDetails?.params["unit-name"] }}></div>
                    <div className="product-desc">
                      <a style={{ width: "95%" }} href={`./asset/escrow/${eachEscrowAsset?.assetInfo["asset-id"]}`} className="product_title">
                        <div style={{
                          wordBreak: "break-word",
                          paddingRight: "0.4em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "22px",
                          color: "black",

                        }}
                        >
                          {eachEscrowAsset?.assetDetails?.params["name"]}
                        </div>
                      </a>
                      <ul className="titlebtm">
                        <li>
                          <p>
                            <a>Owned by</a>
                          </p>
                        </li>
                        <li className="product_cat">
                          <a>
                            <span className="lnr lnr-user"></span>
                            {eachEscrowAsset.pricing.owner.substring(0, 3)}...{eachEscrowAsset.pricing.owner.substring(eachEscrowAsset.pricing.owner.length - 3)}
                          </a>
                        </li>
                        {/* <br />
                          <li className="product_cat"> Amount: <a>{eachEscrowAsset?.assetInfo?.amount}</a></li> */}
                        <br />
                        <li className="product_cat">
                          Asset id: <a>{eachEscrowAsset?.assetInfo["asset-id"]}</a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })}

            {(!loadingEscrowAssets && !escrowAssets.length) && (<div
              id="loading-nfts-escrow-div"
              style={{ display: "flex" }}
              className="col-lg-12 col-md-12"
            >
              <h4>No NFT's Listed Yet!</h4>
            </div>)}
          </div>

          {/* go to market page */}
          <div className="row">
            <div className="col-md-12">
              <div className="more-product">
                <a
                  href="/market"
                  className="btn btn-lg btn--round btn-secondary"
                >
                  Go to Market
                </a>
              </div>
            </div>
          </div>
        </div >
      </section >
      <Footer />
    </>
  );
}
