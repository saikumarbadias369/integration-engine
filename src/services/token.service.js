const { now } = require("mongoose")
const Token = require("../models/token.model")
const { default: axios } = require("axios")

exports.saveToken = async (provider, tokenData) => {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
    console.log("savetokenData> " + tokenData.access_token)
    console.log("savetokenData> " + tokenData.refresh_token)

    await Token.findOneAndUpdate({ provider }, {
        accessToken: tokenData.access_token,
        expiresAt,
        ...(tokenData.refresh_token && { refreshTokne: tokenData.refresh_token })

    }, { upsert: true, new: true })
}

exports.getValidAccessToken = async (provider) => {
    console.log("getValidAccessToken>> "+provider)
    const token = await Token.findOne({ provider })
 console.log("getValidAccessToken>> "+token)
    if (!token) {
        throw new Error("no token found for provider")
    }

    if (Date.now() >= token.expiresAt.getTime()) {
        console.log("access token expired. Refreshing..")
        return await exports.refreshAccessToken(provider, token.refreshTokne)
    }

    return token.accessToken
}


exports.refreshAccessToken = async (provider, refreshToken) => {

    try {
        const response = await axios.post("http://localhost:5001/token", { grant_type: "refresh_token", refresh_token: refreshToken })
        const tokenData = response.data
        console.log("tokenData> "+tokenData)
        await exports.saveToken(provider, tokenData)
        return tokenData.accessToken
    } catch (error) {
        console.log(error.message)
        throw new Error("Refresh token expired. Re-authorization required.")
    }
}