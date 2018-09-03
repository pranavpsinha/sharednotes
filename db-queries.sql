create database deepspace9;
use deepspace9;

create table userinfo (userid int primary key auto_increment, username varchar(10), userkey varchar(20));
create table sharednotes (noteid int primary key auto_increment, note_key varchar(10), note_title varchar(1000), note_body varchar(10000), created_on varchar(10));
create table usernotes (id int primary key auto_increment, userid int, noteid int);

select * from userinfo;
select * from sharednotes;
select * from usernotes;

select sharednotes.note_title as title, userinfo.username as author, sharednotes.created_on as createdOn, sharednotes.note_key as url
from sharednotes, userinfo
where
userinfo.username = (
	select userinfo.username from userinfo 
    where userid = (
		select usernotes.userid from usernotes where usernotes.noteid = sharednotes.noteid
    )
) order by sharednotes.noteid desc;

select sharednotes.note_title as title, userinfo.username as author, sharednotes.created_on as createdOn, sharednotes.note_body as url
from sharednotes, userinfo
where
note_key = "KIWTBG1318" and
userinfo.username = (
	select userinfo.username from userinfo 
    where userid = (
		select usernotes.userid from usernotes where usernotes.noteid = sharednotes.noteid
    )
);

delete from sharednotes where noteid = 5; delete from usernotes where id in ( select * from (select id from usernotes as u2 where noteid = 5 ) as p);








