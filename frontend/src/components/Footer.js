import React from 'react'

export default function Footer() {
  return (
    <footer className="footer-area">
      <div className="mini-footer">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="copyright-text">
                <p>
                  &copy; 2022
                  <a href="#"> MartPlace</a>. All rights reserved. Created by
                  <a href="#"> AazzTech</a>
                </p>
              </div>
              <div className="go_top" onClick={() => window?.scrollTo({
                top: 0,
                // left: 100,
                behavior: 'smooth'
              })}>
                <span className="lnr lnr-chevron-up"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer >
  )
}
