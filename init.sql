-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: my_database
-- ------------------------------------------------------
-- Server version	5.5.5-10.6.27-MariaDB-ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `educations`
--

DROP TABLE IF EXISTS `educations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `educations` (
  `idx` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL COMMENT '교육/강의 제목',
  `location` varchar(100) DEFAULT NULL COMMENT '교육 장소',
  `edu_date` date NOT NULL COMMENT '교육 진행 일자 (검색용)',
  `total_people` varchar(255) NOT NULL COMMENT '교육 참석 인원(통계용)',
  `start_time` datetime NOT NULL COMMENT '실제 교육 시작 일시',
  `end_time` datetime NOT NULL COMMENT '실제 교육 종료 일시',
  `stat_base_type` varchar(64) DEFAULT 'START' COMMENT '출결 판정 기점 (시작시간 기준 vs 종료시간 기준)',
  `stat_range_min` int(11) DEFAULT 30 COMMENT '출석 인정 범위 (분 단위, 예: +-30분)',
  `regdate` datetime DEFAULT current_timestamp() COMMENT '등록 일시',
  `is_deleted` varchar(45) DEFAULT 'n',
  PRIMARY KEY (`idx`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='교육 및 출결 정책 마스터 테이블';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `educations`
--

LOCK TABLES `educations` WRITE;
/*!40000 ALTER TABLE `educations` DISABLE KEYS */;
INSERT INTO `educations` VALUES (1,'상반기 신입 사원','대회의실','2026-06-03','100','2026-06-03 12:00:00','2026-06-03 14:00:00','START',30,'2026-06-03 12:35:15','n'),(2,'ㅅㄷㄴㅅ','23ㄱ','2026-06-04','235','2026-06-04 12:00:00','2026-06-04 14:00:00','START',30,'2026-06-03 12:38:31','n'),(3,'ㅅㄷㄴㅅ6767','23ㄱ','2026-06-04','235','2026-06-04 12:00:00','2026-06-04 14:00:00','START',30,'2026-06-03 12:38:59','n');
/*!40000 ALTER TABLE `educations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `educations_sheet`
--

DROP TABLE IF EXISTS `educations_sheet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `educations_sheet` (
  `idx` int(11) NOT NULL AUTO_INCREMENT,
  `education_idx` int(11) NOT NULL COMMENT 'educations 테이블의 idx',
  `user_social_id` int(11) NOT NULL COMMENT '사용자 아이디',
  `user_social_church` varchar(255) NOT NULL,
  `user_social_major` varchar(255) NOT NULL COMMENT '사용자 소속(자장부청)',
  `user_social_minor` varchar(255) NOT NULL COMMENT '사용자 소속2(지역)',
  `user_social_grade` varchar(255) NOT NULL COMMENT '사용자 직책(구역장, 부구역장...)',
  `user_social_name` varchar(255) NOT NULL COMMENT '사용자 이름',
  `user_social_number` varchar(255) NOT NULL COMMENT '사용자 전화번호',
  `user_social_goyuck` varchar(255) NOT NULL,
  `user_sosuck` varchar(255) NOT NULL,
  `regdate` datetime DEFAULT current_timestamp() COMMENT '명단 등록일',
  PRIMARY KEY (`idx`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='교육별 참석 대상자 명단 테이블';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `educations_sheet`
--

LOCK TABLES `educations_sheet` WRITE;
/*!40000 ALTER TABLE `educations_sheet` DISABLE KEYS */;
INSERT INTO `educations_sheet` VALUES (2,3,9243659,'부산교회','청년회','범일1','부구역장','김주찬','00360729-00529','211','신천지 > 부산야고보지파 > 부산교회 > 청년회 > 범일1 > 21','2026-06-04 04:56:16');
/*!40000 ALTER TABLE `educations_sheet` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-05  0:31:04
