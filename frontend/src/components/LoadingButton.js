
export default function LoadingButton({ heading, backgroundColor, classes, width }) {
  return (
    <button
      disabled
      className={classes ? classes : "btn btn--lg btn--round"}
      style={{
        width: width ? width : "100%",
        background: backgroundColor ? backgroundColor : "#7347c1",
        color: 'white'
      }}
    >
      <i className="fa fa-spinner fa-spin"></i>
      &nbsp;
      {heading}
    </button>
  )
}
