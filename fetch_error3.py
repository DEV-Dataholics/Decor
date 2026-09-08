import ftplib
FTP_HOST = 'ftp.dataholics.com.mx'
FTP_USER = 'noodles@decor.dataholics.com.mx'
FTP_PASS = 'KztSSA-MuMEU'
ftp = ftplib.FTP(FTP_HOST)
ftp.login(FTP_USER, FTP_PASS)
with open('error_log.txt', 'wb') as f:
    try:
        ftp.retrbinary('RETR api/error_log', f.write)
    except:
        pass
ftp.quit()
