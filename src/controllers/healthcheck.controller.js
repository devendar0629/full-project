import { SERVER_HEALTH } from "../constants";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const getHealth = (req, res) => {
    if (SERVER_HEALTH === "OK")
        return res.json(new ApiResponse(200, {}, "Server is working fine"));

    return res.json(new ApiError(500, "Server currently unavailable"));
};

export { getHealth };
