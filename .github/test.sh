ccm create test8625732647544266 -v 3.11.4
ccm populate -n 1:0
timeout 120 ccm start --wait-for-binary-proto 
echo $?
echo "Done"