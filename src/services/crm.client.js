const axios = require("axios")
const tokenservice = require("./token.service")
const limiter = require("../utils/ratelimiter")

const BASE_URL = "https://crm-integration-engine.onrender.com"


exports.getContact = async () => {
    try {
        const token = await tokenservice.getValidAccessToken("hubspot")
        // if (Math.random() < 0.5) {
        //     throw new Error("Random failure")
        // }

        console.log("token>>" + token)

        return limiter.schedule(async () => {
            const response = await axios.get(`${BASE_URL}/contact`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            console.log("in Get contact> "+response.data)
            return response.data

            
        })



    } catch (err) {
        console.log("401 detechetd. refreshing token..")
        if (err.response?.status === 401) {
            const newToken = await tokenservice.refreshAccessToken("hubspot")

            

                  const retryResponse = await axios.get(`${BASE_URL}/contact`, {
          headers: { Authorization: `Bearer ${newToken}` }
        })

           

            return retryResponse.data
        }

        throw err


    }

}