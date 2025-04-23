import axios from "axios";

export default axios.create({
  baseURL: "https://api.rawg.io/api",
  params: {
    key: "e7d726bdff364fa99b63e4c679a54952",
  },
});
