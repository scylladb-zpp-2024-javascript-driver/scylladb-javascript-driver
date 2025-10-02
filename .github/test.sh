ccm create test8625732647544266 -v 3.11.4
ccm populate -n 1:0
# set -e
timeout 60 ccm start --wait-for-binary-proto 
# echo $?
# echo "Above is a code from the first run"
# ccm remove 
# ccm create test1436203882558078 -v 3.11.4
# ccm populate -n 3:0
# timeout 120 ccm start --wait-for-binary-proto
# echo $?
# echo "Above is a code from the second run"
# echo "Done"