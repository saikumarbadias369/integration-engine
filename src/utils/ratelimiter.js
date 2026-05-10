const Bottleneck=require("bottleneck")
const limiter=new Bottleneck({
    minTime:200,
    maxConcurrent: 1  
})
module.exports=limiter