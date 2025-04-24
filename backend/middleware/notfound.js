const notFound = (req, res, next) => {
    res.status(404).json({
      success: false,
      message: "error 404 not found",
    });
  };
  
  export default notFound;
  