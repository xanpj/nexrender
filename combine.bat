cd C:\Users\apjagaciak\Documents\code\trapnationrender-prod
ffmpeg.exe -r 30 -i "temp\frames%04d.jpg" -i assets\song.mp3 -c:v libx264 -preset slow -profile:v high -crf 18 -coder 1 -pix_fmt yuv420p -movflags +faststart -g 30 -bf 2 -c:a aac -b:a 384k -profile:a aac_low -r 30 -y results\video-from-frames.mp4

ffmpeg.exe -r 30 -start_number 0 -i temp\frames%04d.jpg -i assets\song.mp3 -c:v libx264 -c:a aac -b:a 384k  -pix_fmt yuv420p -shortest -r 30 -y results\video-from-frames.mp4

ffmpeg.exe -r 30 -i temp\frames%04d.jpg -i assets\song.mp3 -c:v libx264 -preset slow -profile:v high -crf 0 -coder 1 -pix_fmt yuv420p -movflags +faststart -g 30 -bf 2 -c:a aac -b:a 384k -profile:a aac_low -r 30 -shortest -y results\video-from-frames.mp4

ffmpeg.exe -r 30 -i temp\frames%04d.jpg -i assets\song.mp3 -c:v libx264 -preset ultrafast -crf 0 -coder 1 -pix_fmt yuv420p -movflags +faststart -g 30 -bf 2 -c:a aac -b:a 384k -r 30 -shortest -y results\video-from-frames.mp4

WORKS:
ffmpeg.exe -r 30 -i temp\frames%04d.jpg -i assets\song.mp3 -crf 1 -pix_fmt yuv420p -c:a aac -b:a 384k -r 30 -shortest -y results\video-from-frames.mp4
ffmpeg.exe -r 30 -i temp\result_%05d.jpg -i assets\song.mp3 -crf 1 -pix_fmt yuv420p -c:a aac -b:a 384k -r 30 -shortest -y results\video-from-frames.mp4

