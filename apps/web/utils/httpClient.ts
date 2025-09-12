// Preconfigured Axios instance for outbound HTTP requests
import axios from "axios";
import { httpsAgent } from "./http-ca";

export const http = axios.create({ httpsAgent });
