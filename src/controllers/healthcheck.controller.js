import { SERVER_HEALTH } from "../constants.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getHealth = (req, res) => {
    if (SERVER_HEALTH === "OK")
        return res.json(new ApiResponse(200, {}, "Server is working fine"));

    return res.json(new ApiError(500, "Server currently unavailable"));
};

export { getHealth };
