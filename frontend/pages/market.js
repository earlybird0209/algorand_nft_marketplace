import React, { useState, useContext, useEffect } from 'react'
import WalletContext from '../context/WalletContext';
import Header from "../src/components/header"
import LoadingButton from '../src/components/LoadingButton';
import { getAllEscrowAssets, getEachAssetInfo, getAssetDetailsDb, algoToMicroAlgo, microAlgoToAlgo, getAllAdminAssets } from '../src/helpers';
import ReactPaginate from 'react-paginate';
import adminJson from "../adminAssetsInfo.json";

export default function Market() {
  const { state, dispatch } = useContext(WalletContext);
  const [adminAssets, setAdminAssets] = useState([]);
  const [escrowAssets, setEscrowAssets] = useState([]);
  const [loadingAllCombinedAssets, setLoadingAllCombinedAssets] = useState(true);
  const [loadingEscrowAssets, setLoadingEscrowAssets] = useState(true);
  const [loadingAdminAssets, setLoadingAdminAssets] = useState(true);
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false);
  const [badgePrice, setBadgePrice] = useState(0);
  const [paginationNumber, setPaginationNumber] = useState(0);
  const [combinedArray, setCombinedArray] = useState([]);
  const [searchByName, setSearchByName] = useState('')
  const [filterByAlpahbet, setFilterByAlpahbet] = useState('')
  const [searchByPrice, setSearchByPrice] = useState('')

  async function getEscrowData() {
    let escrowDbData = await getAssetDetailsDb(state);
    let mergedDataEscrow = [];
    for (let i = 0; i < escrowDbData.length; i++) {
      const adminJsonData = adminJson.filter((eachAsset) => eachAsset.assetInfo["asset-id"] == escrowDbData[i].assetId)[0];
      mergedDataEscrow.push({ "assetInfo": { ...adminJsonData.assetInfo }, "assetDetails": { ...adminJsonData.assetDetails, params: { ...adminJsonData.assetDetails.params, name: adminJsonData.assetDetails.params.name.trim() } }, "pricing": { ...escrowDbData[i] } })
    }
    setEscrowAssets(mergedDataEscrow);
    setLoadingEscrowAssets(false);
  }

  useEffect(() => { // escrow
    getEscrowData();
  }, [state?.escrowAddress])

  useEffect(() => { // Merging all assets of admin and escrow
    if (!loadingAdminAssets && !loadingEscrowAssets) {
      let temp = escrowAssets.concat(adminAssets);
      temp = temp.sort(() => Math.random() - 0.5);
      setCombinedArray(temp);
      setLoadingAllCombinedAssets(false);
    }
  }, [escrowAssets, adminAssets, loadingAdminAssets, loadingEscrowAssets])

  useEffect(() => { // admin
    getAllAdminAssets(state)
      .then(async (data) => {
        data.assets = data?.assets?.filter((eachAsset) => (!eachAsset["is-frozen"]) && (eachAsset?.amount > 0))
        let mergedDataAdmin = [];
        console.log(data.assets)
        for (let i = 0; i < data.assets.length; i++) {
          const assetInfoJson = adminJson.filter((eachAsset) => eachAsset.assetInfo["asset-id"] == data.assets[i]["asset-id"])[0];
          let temp = {
            assetId: data.assets[i]["asset-id"],
            firstOwner: state?.adminAddress,
            isFeatured: false,
            owner: state?.adminAddress,
            price: process.env.NEXT_PUBLIC_ADMIN_ASSET_PRICE,
          };
          if(assetInfoJson){
            mergedDataAdmin.push({ "assetInfo": { ...data.assets[i] }, "assetDetails": { ...assetInfoJson.assetDetails, params: { ...assetInfoJson.assetDetails.params, name: assetInfoJson.assetDetails.params.name.trim() } }, "pricing": { ...temp } })
          }
        }
        setAdminAssets(mergedDataAdmin);
        setLoadingAdminAssets(false);
      })
      .catch(console.error)
  }, [state?.adminAddress])

  function sliceMyData(myArray) { // slicing for pagination
    let slicedCombinedArray = myArray.slice(paginationNumber, (paginationNumber + Number(process.env.NEXT_PUBLIC_MARKET_ASSETS_LIMIT_PER_PAGE)));
    return slicedCombinedArray;
  }

  function filteredOnlyFeatured(myArray) {
    return myArray.filter((eachAsset) => eachAsset.pricing.isFeatured);
  }

  function sliderFilter(price, nftArr) {
    const filteredNfts = nftArr.filter((eachAsset) => eachAsset.pricing.price <= price);
    return filteredNfts;

  }
  const searchedByName = (e) => {
    setSearchByName(e.target.value)
    setPaginationNumber(0)
  }

  function filterNftsByName(name, completeNfts) {
    const searchValue = name.trim().toLowerCase();
    let filteredAssets = completeNfts.filter((eachAsset) => eachAsset?.assetDetails?.params?.name.toLowerCase().includes(searchValue))
    return filteredAssets;
  }
  function filterByAlphabeticalOrder(e) {
    setFilterByAlpahbet(e.target.value)
    setPaginationNumber(0)
    setSearchByPrice('')
    document.getElementById("filter-by-price").value = "";
  }

  const sortNftsAlphabets = (type, completeNfts) => {
    if (type == "ascending") {
      let newAssets = completeNfts.sort(function (a, b) {
        if (a.assetDetails.params.name.toLowerCase().trim() > b.assetDetails.params.name.toLowerCase().trim()) return 1;
        if (a.assetDetails.params.name.toLowerCase().trim() < b.assetDetails.params.name.toLowerCase().trim()) return -1;
        return 0;
      });
      return newAssets
    }
    else if (type == "descending") {
      let newAssets = completeNfts.sort(function (a, b) {
        if (a.assetDetails.params.name.toLowerCase().trim() < b.assetDetails.params.name.toLowerCase().trim()) return 1;
        if (a.assetDetails.params.name.toLowerCase().trim() > b.assetDetails.params.name.toLowerCase().trim()) return -1;
        return 0;
      });
      return newAssets
    }
    return completeNfts;
  }

  const handlePriceFilter = (e) => {
    setSearchByPrice(e.target.value)
    setPaginationNumber(0)
    setFilterByAlpahbet('')
    document.getElementById("filter-by-alphabet").value = "";
  }

  const sortNftsByPrice = (type, completeNfts) => {
    if (type == "low") {
      let newAssets = completeNfts.sort(function (a, b) {
        if (Number(a.pricing.price) > Number(b.pricing.price)) return 1;
        if (Number(a.pricing.price) < Number(b.pricing.price)) return -1;
        return 0;
      });
      return newAssets
    }
    else if (type == "high") {
      let newAssets = completeNfts.sort(function (a, b) {
        if (Number(a.pricing.price) < Number(b.pricing.price)) return 1;
        if (Number(a.pricing.price) > Number(b.pricing.price)) return -1;
        return 0;
      });
      return newAssets
    }
  }

  const handlePageClick = (event) => {
    setPaginationNumber(event.selected * Number(process.env.NEXT_PUBLIC_MARKET_ASSETS_LIMIT_PER_PAGE));
  }

  const completeNfts = showOnlyFeatured ? filteredOnlyFeatured(combinedArray) : combinedArray
  const filterNftsWithName = searchByName ? filterNftsByName(searchByName, completeNfts) : completeNfts
  const sortedNftsWithAlphabets = filterByAlpahbet ? sortNftsAlphabets(filterByAlpahbet, filterNftsWithName) : filterNftsWithName
  const sortedNftsWithPrice = searchByPrice ? sortNftsByPrice(searchByPrice, filterNftsWithName) : filterNftsWithName
  const chooseFilter = filterByAlpahbet ? sortedNftsWithAlphabets : searchByPrice ? sortedNftsWithPrice : filterNftsWithName
  const filterbadgePrice = badgePrice ? sliderFilter(microAlgoToAlgo(badgePrice), chooseFilter) : chooseFilter;
  const nfts = sliceMyData(filterbadgePrice)
  const highPrice = algoToMicroAlgo(Math.max(...completeNfts?.map((eachAsset) => eachAsset?.pricing?.price)));
  const paginationLength = Math.ceil(Object.keys(filterbadgePrice).length ? filterbadgePrice?.length / Number(process.env.NEXT_PUBLIC_MARKET_ASSETS_LIMIT_PER_PAGE) : 0);

  return (
    <>
      <Header />
      <section className="search-wrapper">
        <div className="search-area2 bgimage">
          <div className="bg_image_holder">
            <img src="images/search.jpg" alt="" />
          </div>
          <div className="container content_above">
            <div className="row">
              <div className="col-md-8 offset-md-2">
                <div className="search">
                  <div className="search__title">
                    <h3>
                      <span>{filterbadgePrice.length}</span> NTFs ready to buy</h3>
                  </div>
                  <div className="search__field">
                    <div className="field-wrapper">
                      <div className="input-group mb-3" style={{ overflow: "hidden", borderRadius: "40px" }}>
                        <input
                          onChange={searchedByName}
                          id="searchInputValue" className="form-control relative-field" type="text" placeholder="Search ..."
                        />
                        <div className="input-group-prepend">
                          <span className="input-group-text" id="basic-addon1"><img style={{ width: "20px" }} src='/images/searchicon.png' /></span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="filter-area">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="filter-bar filter--bar2">
                <div className="pull-right" style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
                  <div className="filter__option filter--select">
                    <div className="select-wrap">
                      <select id="filter-by-alphabet" name="az-order" onChange={filterByAlphabeticalOrder}>
                        <option value="">Sort by order</option>
                        <option value="ascending">A-Z</option>
                        <option value="descending">Z-A</option>
                      </select>
                      <span className="lnr lnr-chevron-down"></span>
                    </div>
                  </div>
                  <div className="filter__option filter--select">
                    <div className="select-wrap">
                      <select id="filter-by-price" onChange={handlePriceFilter} name="price">
                        <option value="">Sort by Price</option>
                        <option value="low">Price : Low to High</option>
                        <option value="high">Price : High to low</option>
                      </select>
                      <span className="lnr lnr-chevron-down"></span>
                    </div>
                  </div>
                  {/* <div className="filter__option filter--select">
                    <div className="select-wrap">
                      <select name="price">
                        <option value="12">12 Items per page</option>
                        <option value="15">15 Items per page</option>
                        <option value="25">25 Items per page</option>
                      </select>
                      <span className="lnr lnr-chevron-down"></span>
                    </div>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="products section--padding2">
        <div className="container">
          <div className="row">
            {/* filter products */}
            <div className="col-lg-3">
              <aside className="sidebar product--sidebar">

                <div className="sidebar-card card--filter">
                  <a className="card-title" href="#collapse2" role="button" data-toggle="collapse" aria-expanded="false" aria-controls="collapse2">
                    <h4>Filter Products
                      <span className="lnr lnr-chevron-down"></span>
                    </h4>
                  </a>
                  <div className="collapse show collapsible-content" id="collapse2">
                    <ul className="card-content">
                      <li>
                        <div className="custom-checkbox2">
                          <input onClick={(e) => { setShowOnlyFeatured(e.target.checked); setPaginationNumber(0) }} type="checkbox" id="opt1" className="" name="filter_opt" />
                          <label htmlFor="opt1">
                            <span className="circle"></span>Feature Products</label>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="sidebar-card card--slider">
                  <a className="card-title" href="#collapse3" role="button" data-toggle="collapse" aria-expanded="false" aria-controls="collapse3">
                    <h4>Filter Products
                      <span className="lnr lnr-chevron-down"></span>
                    </h4>
                  </a>
                  <div className="collapse show collapsible-content" id="collapse3">
                    <div className="card-content">
                      <div className="range-slider price-range"></div>

                      <input
                        style={{ width: "100%" }}
                        id="customRange3"
                        type="range"
                        className="form-range"
                        onChange={
                          (e) => {
                            setBadgePrice((e.target.value).substring(0, 4))
                            setPaginationNumber(0)
                          }
                        }
                        value={badgePrice ? badgePrice : highPrice}
                        // defaultValue={highPrice}
                        min={0}
                        max={5}
                        step="0.000001"
                        disabled={loadingAllCombinedAssets ? true : false}
                      />

                      <div className="price-ranges">
                        <span className="from rounded">{loadingAllCombinedAssets ? "..." : 0} A</span>
                        <span className="to rounded">
                          {
                            loadingAllCombinedAssets ? "..."
                              : badgePrice ? badgePrice :
                                highPrice
                          } A
                        </span>
                      </div>

                    </div>
                  </div>
                </div>
              </aside>
            </div>

            {/* assets */}
            <div className="col-lg-9">
              <div className="row">
                {
                  state?.user?.account && state?.user?.wallet ?
                    loadingAllCombinedAssets ?
                      (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }} className='col-lg-12 col-md-12'>
                          <LoadingButton heading="Loading Assets" />
                        </div>
                      )
                      : (!nfts.length) && (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }} className='col-lg-12 col-md-12'>
                          <h1>NO NFTS FOUND!</h1>
                        </div>
                      )
                    :
                    (
                      <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }} className='col-lg-12 col-md-12'>
                        <button disabled className="btn btn--lg btn--round" style={{ width: "100%", background: "#7347c1", color: 'white' }}>Wallet not connected</button>
                      </div>
                    )
                }

                {/* all assets */}
                {((state?.user?.account && state?.user?.wallet)) && nfts?.map((eachAsset, ind) => {
                  return (
                    <div key={ind} data-name={eachAsset?.assetDetails?.params["name"].toLowerCase()} className="col-lg-4 col-md-6">
                      <div style={{ width: "100%" }} className="product product--card product--card-small">
                        <div className="product__thumbnail" style={{ boxShadow: "rgb(0 0 0 / 9%) 0px 2px 4px", backgroundColor: eachAsset?.assetDetails?.params["unit-name"] }}></div>
                        <div className="product-desc">
                          {
                            eachAsset.pricing.owner == state?.adminAddress
                              ?
                              <a style={{ width: "95%" }} href={`./asset/${eachAsset?.assetInfo["asset-id"]}`} className="product_title">
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

                                  {eachAsset?.assetDetails?.params["name"]}
                                </div>

                              </a>
                              :
                              <a style={{ width: "95%", color: eachAsset?.pricing?.isFeatured ? "gold" : "grey" }} href={`./asset/escrow/${eachAsset?.assetInfo["asset-id"]}`} className="product_title"
                              >
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

                                  {eachAsset?.assetDetails?.params["name"]}

                                </div>

                                {showOnlyFeatured ? (
                                  <a className="product_title">
                                    <h4 style={{ color: eachAsset?.pricing?.isFeatured ? "gold" : "grey" }} className="fa fa-star"></h4>
                                  </a>
                                ) : ""}

                              </a>

                          }
                        </div>

                        <div className="product-purchase">
                          <div className="price_love">
                            <span>{algoToMicroAlgo(eachAsset?.pricing?.price) || 0} A</span>
                          </div>
                          <a>
                            <span className="lnr lnr-user"></span>
                            {eachAsset?.pricing?.owner.substring(0, 3)}...{eachAsset?.pricing?.owner.substring(eachAsset?.pricing?.owner.length - 3)}
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}

              </div>
            </div>

          </div>

          {/* old html pagination */}
          <div style={{ display: 'none' }} className="row">
            <div className="col-md-12">
              <div className="pagination-area categorised_item_pagination">
                <nav className="navigation pagination" role="navigation">
                  <div className="nav-links">
                    <a className="prev page-numbers" href="#">
                      <span className="lnr lnr-arrow-left"></span>
                    </a>
                    <a className="page-numbers current" href="#">1</a>
                    <a className="page-numbers" href="#">2</a>
                    <a className="page-numbers" href="#">3</a>
                    <a className="next page-numbers" href="#">
                      <span className="lnr lnr-arrow-right"></span>
                    </a>
                  </div>
                </nav>
              </div>
            </div>
          </div>


          {loadingAllCombinedAssets ? (
            <nav className="col-lg-12 col-md-12 mb-3" aria-label="Page navigation example">
              <ReactPaginate
                previousLabel="< Previous"
                nextLabel="Next >"
                breakLabel="..."
                pageCount={paginationLength} // total number of pages to be displayed
                marginPagesDisplayed={2} // length of numbers displayed after pagination 

                containerClassName="disabled pagination justify-content-end"
                pageClassName="disabled page-item btn"
                pageLinkClassName="disabled page-link"

                previousClassName="disabled page-item btn"
                previousLinkClassName="disabled page-link"
                nextClassName="disabled page-item btn"
                nextLinkClassName="disabled page-link"

                breakClassName="disabled page-item btn"
                breakLinkClassName="disabled page-link"

                activeClassName="disabled active btn"

              />
            </nav>
          ) : ""}

          {(!loadingAllCombinedAssets && paginationLength) ? (
            <nav className="col-lg-12 col-md-12 mb-3" aria-label="Page navigation example">
              <ReactPaginate
                previousLabel="< Previous"
                nextLabel="Next >"
                breakLabel="..."
                pageCount={paginationLength} // total number of pages to be displayed
                marginPagesDisplayed={2} // length of numbers displayed after pagination 
                onPageChange={handlePageClick}
                forcePage={paginationNumber / process.env.NEXT_PUBLIC_MARKET_ASSETS_LIMIT_PER_PAGE}

                containerClassName="pagination justify-content-end"
                pageClassName="page-item btn"
                pageLinkClassName="page-link"

                previousClassName="page-item btn"
                previousLinkClassName="page-link"
                nextClassName="page-item btn"
                nextLinkClassName="page-link"

                breakClassName="page-item btn"
                breakLinkClassName="page-link"

                activeClassName="active btn"

              />
            </nav>
          ) : ""}
        </div>
      </section>
    </>
  )
}
