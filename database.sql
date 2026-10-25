drop table if exists answer, attempts, scores, player, levels, question, images;


--creating player table--
CREATE TABLE Player (
	player_id serial PRIMARY KEY,
	player_name VARCHAR ( 50 ) NOT NULL,
	player_age int NOT NULL
);

--creating levels table--
CREATE TABLE Levels (
	level_id serial PRIMARY KEY,
	level_name VARCHAR ( 50 ) NOT NULL
);

--creating question table--
CREATE TABLE Question (
	question_id serial PRIMARY KEY,
	question_text VARCHAR ( 50 ) NOT NULL,
	question_hint VARCHAR ( 50 ) NOT NULL,
	question_level int NOT NULL
);


--creating images table--
CREATE TABLE images (
	image_id serial PRIMARY KEY,
	image_url varchar (200) not null
);

--creating answer table--
CREATE TABLE Answer (
	answer_id serial PRIMARY KEY,
	question_id int not null,
	foreign key (question_id) references Question(question_id),
	answer_text varchar (200) not null
);

--creating attempts table--
CREATE TABLE Attempts (
	attempts_id serial PRIMARY KEY,
	question_id int not null,
	foreign key (question_id) references Question(question_id),
	player_id int not null,
	foreign key (player_id) references Player(player_id)
);

--creating scores table--
CREATE TABLE Scores (
	score_id serial PRIMARY KEY,
	player_id int not null,
	foreign key (player_id) references Player(player_id),
);