const NCMB = require('ncmb');

module.exports = async function(req, res) {
  try {
    // 1. mBaaSの初期化処理
    const applicationKey = '03ea01c8229735accbd10a70e118b3e265d681a3fb007b4d585b8761263486ae';
    const clientKey = '32c680a09bc4762df581da58c22d5bb805259549a29576b58ee39bed8d63af0d';
    const ncmb = new NCMB(applicationKey, clientKey);

    // 2. 管理者ユーザーでログイン
    await ncmb.User.login('admin', 'admin');

    // 3. 変数の準備
    - d  
    処理対象の日付
    - startDate  
    処理対象の日付の00:00
    - endDate  
    処理対象の日付の次の日（00:00）
    - fileName  
    保存するファイル名。日付を元に設定
    // 処理対象の日付
    const d = req.query.date ? new Date(req.query.date) : new Date;
    // 処理対象の日付の00:00を取得
    const startDate = new Date(`${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} 00:00:00 UTC+0900`);
    // 処理対象の日付の次の日（00:00）を取得
    const endDate = new Date(`${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} 00:00:00 UTC+0900`);
    // 保存するファイル名を、日付を元に設定
    const fileName = `working-${startDate.getFullYear()}-${startDate.getMonth() + 1}-${startDate.getDate()}.csv`;
    d.setDate(d.getDate() + 1);

    // 4. データストアの検索
    const ary = await ncmb.DataStore('Record')
    // ユーザデータも一緒に取得します
    .include('user')
    // 勤務時間が入っているものだけ
    .equalTo('working', false)
    // 処理対象日時（00:00）以上
    .greaterThanOrEqualTo('createDate', startDate)
    // 処理対象日時の次の日（00:00）未満
    .lessThan('createDate', endDate)
    // 最大1000件（mBaaSの最大取得件数）
    .limit(1000)
    .fetchAll();

    // 5. CSV化
    const csv = [];
    const columns = ['objectId', 'time', 'name', 'startAt', 'endAt'];
    csv.push(columns.map(c => `"${c}"`).join("\t"));
    for (let row of ary) {
    const params = [
        row.get('objectId'),
        row.get('time').iso,
        Object.keys(row.get('user')).length > 0 ? row.get('user').name.replace(/"/g, '""') : '',
        new Date(row.get('time').iso).toLocaleString(),
        new Date(new Date(row.get('time').iso).getTime() + row.get('workingTime')).toLocaleString()
    ];
    csv.push('"' + params.join("\"\t\"") + '"');
    }

    // 6. ファイルストアへの保存
    const buf = Buffer.from(csv.join("\r\n"), 'UTF-8');
    await ncmb.File.upload(fileName, buf);

    // 7. 処理完了
    res.send('Uploaded');
  } catch (err) {
    // エラー
    res.send(JSON.stringify(err));
  }
}
