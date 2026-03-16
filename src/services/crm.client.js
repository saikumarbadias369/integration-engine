const axios = require("axios")
const tokenservice = require("./token.service")
const limiter = require("../utils/ratelimiter")

const BASE_URL = "http://localhost:5001"


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
            return response.data

        })



    } catch (err) {
        console.log("401 detechetd. refreshing token..")
        if (err.response?.status === 401) {
            const newtoken = await tokenservice.refreshAccessToken("hubspot")

            try {
                await axios.get(`${BASE_URL}/contact`, {
                    headers: {
                        Authorization: `Bearer ${newtoken}`
                    }
                })
            } catch (e) {
                console.log("with New token>> " + e.message)

            }

            return response.data
        }

        throw err


    }

}