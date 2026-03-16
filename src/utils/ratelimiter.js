const Bottleneck=require("bottleneck")
const limiter=new Bottleneck({
    minTime:200
})
module.exports=limiter